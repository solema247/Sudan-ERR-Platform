// pages/api/scan-form.ts

import { NextApiRequest, NextApiResponse } from 'next';
import vision from '@google-cloud/vision';
import OpenAI from 'openai';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import formidable from 'formidable';
import { franc } from 'franc';
import os from 'os';

// Disable Next.js's default body parsing to allow for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// Initialize Google Vision
const visionClient = new vision.ImageAnnotatorClient({
  credentials: (() => {
    const creds = JSON.parse(process.env.GOOGLE_VISION!);
    // Very important: convert the string "\n" to real newlines
    creds.private_key = creds.private_key.replace(/\\n/g, '\n');
    return creds;
  })(),
});

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Function to parse multipart/form-data using formidable
async function parseForm(req: NextApiRequest): Promise<{ filePath: string }> {
  const uploadDir = os.tmpdir();

  const form = formidable({
    multiples: false,
    keepExtensions: true,
    uploadDir,
    filename: (name, ext) => `${Date.now()}-${name}${ext}`
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }
      console.log('Files received:', files);
      const file = files.file[0] as formidable.File;
      if (!file) {
        reject(new Error('No file uploaded'));
        return;
      }
      resolve({ filePath: file.filepath });
    });
  });
}

// Function to preprocess the image and convert to binary for Google Vision
async function preprocessImageToBuffer(imagePath: string): Promise<Buffer> {
  console.log('Attempting to process image at path:', imagePath);

  const processedImageBuffer = await sharp(imagePath)
  .grayscale()
  .modulate({ brightness: 1.2 }) // Remove 'contrast'
  .linear(1.5, -128 * 1.5 + 128) // Apply contrast adjustment
  .jpeg({ quality: 90 })
  .toBuffer();

  console.log('Image successfully processed and ready for OCR.');
  return processedImageBuffer;
}

// Function to run Google Vision OCR on the processed image buffer
async function googleVisionOCR(imageBuffer: Buffer): Promise<string> {
  const [result] = await visionClient.textDetection({
    image: { content: imageBuffer.toString('base64') },
    imageContext: { languageHints: ['en', 'ar', 'es'] },
  });
  const detections = result.textAnnotations;
  const ocrText = detections && detections.length ? detections[0].description!.trim() : 'Not found';
  console.log('Google Vision OCR Output:', ocrText);
  return ocrText;
}

// Function to clean extracted text
function cleanExtractedText(rawText: string): string {
  return rawText.replace(/[\n\r]+/g, ' ').trim();
}

// Function to detect language of the text
function detectLanguage(text: string): string {
  const langCode = franc(text);
  console.log('Detected language code:', langCode);
  if (langCode === 'ara') return 'ar';
  if (langCode === 'spa') return 'es';
  return 'en';
}

// Function to get prompt based on detected language
function getPromptForLanguage(language: string, cleanedText: string): string {
  const promptPath = path.join(process.cwd(), 'public', 'locales', language, 'prompts.json');
  const promptData = JSON.parse(fs.readFileSync(promptPath, 'utf-8'));
  const promptTemplate = promptData.prompt;
  return promptTemplate.replace('${cleanedText}', cleanedText);
}

// OpenAI GPT-based classification
async function chatGPTClassification(rawText: string): Promise<any> {
  const cleanedText = cleanExtractedText(rawText);
  const detectedLanguage = detectLanguage(cleanedText);
  const prompt = getPromptForLanguage(detectedLanguage, cleanedText);

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1000,
    temperature: 0.7,
  });

  const openAIOutput = response.choices[0].message?.content || 'An error occurred while processing the data.';
  
  const structuredData = {
    err_id: '',
    date: '',
    expenses: [],
    financial_summary: {
      total_expenses: 0,
      total_grant_received: 0,
      total_other_sources: 0,
      remainder: 0
    },
    additional_questions: {
      excess_expenses: '',
      surplus_use: '',
      lessons_learned: '',
      training_needs: ''
    }
  };

  try {
    const parsed = JSON.parse(openAIOutput);
    
    // Map the parsed data with proper type checking
    return {
      err_id: parsed?.err_id || '',
      date: parsed?.date || '',
      expenses: Array.isArray(parsed?.expenses) ? parsed.expenses.map(expense => ({
        activity: expense?.activity || '',
        description: expense?.description || '',
        amount: Number(expense?.amount) || 0,
        payment_date: expense?.payment_date || '',
        payment_method: expense?.payment_method || '',
        receipt_no: expense?.receipt_no || '',
        seller: expense?.seller || ''
      })) : [],
      financial_summary: {
        total_expenses: Number(parsed?.financial_summary?.total_expenses) || 0,
        total_grant_received: Number(parsed?.financial_summary?.total_grant_received) || 0,
        total_other_sources: Number(parsed?.financial_summary?.total_other_sources) || 0,
        remainder: Number(parsed?.financial_summary?.remainder) || 0
      },
      additional_questions: {
        excess_expenses: parsed?.additional_questions?.excess_expenses || '',
        surplus_use: parsed?.additional_questions?.surplus_use || '',
        lessons_learned: parsed?.additional_questions?.lessons_learned || '',
        training_needs: parsed?.additional_questions?.training_needs || ''
      }
    };
  } catch (error) {
    console.error('Error parsing OpenAI response:', error);
    return structuredData; // Return default structure on error
  }
}

// Function to parse OpenAI response to structured form fields
function parseOpenAIResponse(response: string) {
  try {
    const parsedResponse = JSON.parse(response);

    return {
      date: parsedResponse.date || '',
      err_id: parsedResponse.err_id || '',
      expenses: parsedResponse.expenses || [],
      financial_summary: {
        total_expenses: parsedResponse.financial_summary?.total_expenses || '',
        total_grant_received: parsedResponse.financial_summary?.total_grant_received || '',
        total_other_sources: parsedResponse.financial_summary?.total_other_sources || '',
        remainder: parsedResponse.financial_summary?.remainder || ''
      },
      additional_questions: {
        excess_expenses: parsedResponse.additional_questions?.excess_expenses || '',
        surplus_use: parsedResponse.additional_questions?.surplus_use || '',
        lessons_learned: parsedResponse.additional_questions?.lessons_learned || '',
        training_needs: parsedResponse.additional_questions?.training_needs || ''
      }
    };
  } catch (error) {
    console.error('Error parsing OpenAI response:', error);
    return {};
  }
}

// Fallback function using regular expressions if JSON parsing fails
function parseUsingRegex(response: string) {
  const structuredData = {
    date: '',
    err_id: '',
    expenses: [],
    total_grant: '',
    total_other_sources: '',
    total_expenses: '',
    remainder: '',
    additional_excess_expenses: '',
    additional_surplus_use: '',
    lessons_learned: '',
    additional_training_needs: '',
  };

  // Helper function to extract a single field
  const extractField = (regex: RegExp) => (response.match(regex)?.[1] || '').trim();

  // Extract data based on expected format
  structuredData.date = extractField(/Date:\s*(\d{2}\/\d{2}\/\d{2})/);
  structuredData.err_id = extractField(/ERR Number:\s*(\d+)/);

  // Extract activity table entries
  const activityRegex = /- Activity:\s*(.+?)\s*- Description of Expenses:\s*(.+?)\s*- Payment Date:\s*(\d{2}\/\d{2})\s*- Seller\/Recipient Details:\s*(.+?)\s*- Payment Method:\s*(.+?)\s*- Receipt Number:\s*(\d+)\s*- Expenses:\s*(\d+)/g;
  let match;
  while ((match = activityRegex.exec(response)) !== null) {
    structuredData.expenses.push({
      activity: match[1],
      description: match[2],
      payment_date: match[3],
      seller: match[4],
      payment_method: match[5],
      receipt_no: match[6],
      amount: match[7],
    });
  }

  // Extract financial summary fields
  structuredData.total_expenses = extractField(/Total Expenses in SDG:\s*(\d+)/);
  structuredData.total_grant = extractField(/Total Grant Received:\s*(\d+)/);
  structuredData.total_other_sources = extractField(/Total Amount from Other Sources:\s*(\d+)/);
  structuredData.remainder = extractField(/Remainder:\s*(\d+)/);

  // Extract additional questions
  structuredData.additional_excess_expenses = extractField(/excess expenses\?\s*(.+)/);
  structuredData.additional_surplus_use = extractField(/surplus if expenses were less than the grant received\?\s*(.+)/);
  structuredData.lessons_learned = extractField(/budget planning\?\s*(.+)/);
  structuredData.additional_training_needs = extractField(/training needs or opportunities\?\s*(.+)/);

  return structuredData;
}

// API Route Handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  let filePath: string | null = null;

  try {
    const { filePath: parsedFilePath } = await parseForm(req);
    filePath = parsedFilePath;

    const processedImageBuffer = await preprocessImageToBuffer(filePath);
    const rawText = await googleVisionOCR(processedImageBuffer);
    const structuredData = await chatGPTClassification(rawText);

    res.status(200).json({ message: 'Data processed successfully', data: structuredData });

  } catch (error: any) {
    console.error(`Processing error: ${error.message}`);
    res.status(500).json({ error: `Error processing scan: ${error.message}` });
  } finally {
    // Clean up: Delete the temporary file
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log('Temporary file cleaned up:', filePath);
      } catch (cleanupError) {
        console.error('Error cleaning up temporary file:', cleanupError);
      }
    }
  }
}

