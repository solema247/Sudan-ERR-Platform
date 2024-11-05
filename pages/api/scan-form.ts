// pages/api/scan-form.ts

import { NextApiRequest, NextApiResponse } from 'next';
import vision from '@google-cloud/vision';
import OpenAI from 'openai';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import formidable from 'formidable';

// Disable Next.js's default body parsing to allow for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// Initialize Google Vision
const visionClient = new vision.ImageAnnotatorClient({
  keyFilename: path.join(process.cwd(), 'local-humanitarian-web-chat-1f81cd59311e.json'),
});

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Function to parse multipart/form-data using formidable
async function parseForm(req: NextApiRequest): Promise<{ filePath: string }> {
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

  const form = formidable({
    multiples: false,
    keepExtensions: true,
    uploadDir: uploadDir,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }
      console.log('Files received:', files); // Log the files object
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
    .modulate({ brightness: 1.2, contrast: 1.5 })
    .jpeg({ quality: 90 })
    .toBuffer();

  console.log('Image successfully processed and ready for OCR.');
  return processedImageBuffer;
}

// Function to run Google Vision OCR on the processed image buffer
async function googleVisionOCR(imageBuffer: Buffer): Promise<string> {
  const [result] = await visionClient.textDetection(imageBuffer);
  const detections = result.textAnnotations;
  const ocrText = detections && detections.length ? detections[0].description!.trim() : 'Not found';
  console.log('Google Vision OCR Output:', ocrText);
  return ocrText;
}

// Function to clean extracted text
function cleanExtractedText(rawText: string): string {
  return rawText.replace(/[\n\r]+/g, ' ').trim();
}

// OpenAI GPT-based classification
async function chatGPTClassification(rawText: string): Promise<any> {
  const cleanedText = cleanExtractedText(rawText);
  const prompt = `
  I have extracted the following text from a financial report form. The text contains multiple sections, including a date, ERR number, an activity table, a financial summary, and responses to additional questions. 
  Here is the text:
  ${cleanedText}

  Please extract the information and structure it in the following JSON format:

  {
    "date": "DD/MM/YY",
    "err_id": "ERR Number",
    "expenses": [
      {
        "activity": "Activity description",
        "description": "Description of Expenses",
        "payment_date": "DD/MM",
        "seller": "Seller/Recipient Details",
        "payment_method": "Payment Method (Cash/Bank App)",
        "receipt_no": "Receipt Number",
        "amount": "Expenses amount"
      },
      ...
    ],
    "financial_summary": {
      "total_expenses": "Total Expenses in SDG",
      "total_grant_received": "Total Grant Received",
      "total_other_sources": "Total Amount from Other Sources",
      "remainder": "Remaining amount"
    },
    "additional_questions": {
      "excess_expenses": "Response to covering excess expenses",
      "surplus_use": "Response to surplus spending",
      "lessons_learned": "Response about budget planning lessons",
      "training_needs": "Response about additional training needs"
    }
  }

  Make sure to follow this structure exactly. Return only the JSON output without additional text.
  `;

  console.log('Prompt sent to OpenAI:', prompt);

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1000,
    temperature: 0.7,
  });

  const openAIOutput = response.choices[0].message?.content || 'An error occurred while processing the data.';
  console.log('OpenAI Response:', openAIOutput);

  // Parse OpenAI response into structured data
  const structuredData = parseOpenAIResponse(openAIOutput);
  return structuredData;
  }

// Function to parse OpenAI response to structured form fields
function parseOpenAIResponse(response: string) {
  try {
    // Attempt to parse JSON response directly, assuming OpenAI now returns JSON format
    const parsedResponse = JSON.parse(response);

    return {
      date: parsedResponse.date || '',
      err_id: parsedResponse.err_id || '',
      expenses: parsedResponse.expenses?.map((expense: any) => ({
        activity: expense.activity || '',
        description: expense.description || '',
        payment_date: expense.payment_date || '',
        seller: expense.seller || '',
        payment_method: expense.payment_method || 'cash',
        receipt_no: expense.receipt_no || '',
        amount: expense.amount || '',
      })) || [],
      total_grant: parsedResponse.financial_summary?.total_grant_received || '',
      total_other_sources: parsedResponse.financial_summary?.total_other_sources || '',
      total_expenses: parsedResponse.financial_summary?.total_expenses || '',
      remainder: parsedResponse.financial_summary?.remainder || '',
      additional_excess_expenses: parsedResponse.additional_questions?.excess_expenses || '',
      additional_surplus_use: parsedResponse.additional_questions?.surplus_use || '',
      lessons_learned: parsedResponse.additional_questions?.lessons_learned || '',
      additional_training_needs: parsedResponse.additional_questions?.training_needs || '',
    };
  } catch (error) {
    console.error("Error parsing OpenAI response:", error);
    return {}; // Return an empty object or handle fallback parsing if needed
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

  try {
    const { filePath } = await parseForm(req);

    const processedImageBuffer = await preprocessImageToBuffer(filePath);
    const rawText = await googleVisionOCR(processedImageBuffer);
    const structuredData = await chatGPTClassification(rawText);

    res.status(200).json({ message: 'Data processed successfully', data: structuredData });

    fs.unlinkSync(filePath);
  } catch (error: any) {
    console.error(`Processing error: ${error.message}`);
    res.status(500).json({ error: `Error processing scan: ${error.message}` });
  }
}
