// pages/api/scan-form.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
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

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Initialize Google Vision
let visionClient;
try {
  const keyPath = path.join(process.cwd(), 'local-humanitarian-web-chat-1f81cd59311e.json');
  visionClient = new vision.ImageAnnotatorClient({
    keyFilename: keyPath,
  });
  console.log('Vision client initialized successfully');
} catch (error) {
  console.error('Vision client initialization error:', error);
}

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Function to parse multipart/form-data using formidable
async function parseForm(
  req: NextApiRequest
): Promise<{ filePath: string }> {
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

  const form = formidable({
    multiples: false, // Handle single file upload
    keepExtensions: true,
    uploadDir: uploadDir,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }
      console.log('Files received:', files); // Log to inspect the files object
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
async function preprocessImageToBuffer(
  imagePath: string
): Promise<Buffer> {
  try {
    console.log('Attempting to process image at path:', imagePath);

    // Load, grayscale, and re-encode the image as JPEG in-memory
    const processedImageBuffer = await sharp(imagePath)
      .grayscale() // Convert to grayscale
      .modulate({ brightness: 1.2, contrast: 1.5 }) // Adjust brightness and contrast
      .jpeg({ quality: 90 }) // Re-encode as JPEG
      .toBuffer();

    console.log('Image successfully processed and ready for OCR.');
    return processedImageBuffer;
  } catch (error: any) {
    console.error('Error during image preprocessing:', error.message);
    throw new Error(`Preprocessing failed: ${error.message}`);
  }
}

// Function to run Google Vision OCR on the processed image buffer
async function googleVisionOCR(imageBuffer: Buffer): Promise<string> {
  try {
    // Pass the image buffer directly to the textDetection method
    const [result] = await visionClient.textDetection(imageBuffer);
    const detections = result.textAnnotations;

    const ocrText =
      detections && detections.length
        ? detections[0].description!.trim()
        : 'Not found';
    console.log('Google Vision OCR Output:', ocrText);
    return ocrText;
  } catch (error: any) {
    console.error(`Google Vision OCR failed: ${error.message}`);
    throw new Error(`Google Vision OCR failed: ${error.message}`);
  }
}

// Function to clean extracted text
function cleanExtractedText(rawText: string): string {
  return rawText.replace(/[\n\r]+/g, ' ').trim();
}

// OpenAI GPT-based classification
async function chatGPTClassification(
  rawText: string
): Promise<string> {
  const cleanedText = cleanExtractedText(rawText);
  const prompt = `
I have extracted the following text from a financial report form. The text contains multiple sections including a date, ERR number, an activity table, a financial summary, and responses to additional questions.
Here is the text:
${cleanedText}
Please extract the following information and structure it accordingly:
1. Date: Identify the date from the text.
2. ERR Number: Extract the ERR number.
3. Activity Table: Identify each row in the activity table and organize the data into the following fields:
   - Activity
   - Description of Expenses
   - Payment Date
   - Seller/Recipient Details
   - Payment Method (Cash/Bank App)
   - Receipt Number
   - Expenses
4. Financial Summary: Extract the following fields:
   - Total Expenses
   - Total Grant Received
   - Total Amount from Other Sources
   - Remainder
5. Additional Questions: Extract responses to the following questions:
   - How did you cover excess expenses?
   - How would you spend the surplus if expenses were less than the grant received?
   - What lessons did you learn about budget planning?
   - Were there any additional training needs or opportunities?
`;

  console.log('Prompt sent to OpenAI:', prompt);

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1000,
    temperature: 0.7,
  });

  const openAIOutput =
    response.choices[0].message?.content ||
    'An error occurred while processing the data.';
  console.log('OpenAI Response:', openAIOutput);
  return openAIOutput;
}

// API Route Handler
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { filePath } = await parseForm(req);

    // Perform preprocessing
    const processedImageBuffer = await preprocessImageToBuffer(filePath);

    // Perform OCR and classification
    const rawText = await googleVisionOCR(processedImageBuffer);
    const structuredResponse = await chatGPTClassification(rawText);

    // Send the structured response back to the client
    res.status(200).json({ message: structuredResponse });

    // Clean up the uploaded file
    fs.unlinkSync(filePath);
  } catch (error: any) {
    console.error(`Processing error: ${error.message}`);
    res
      .status(500)
      .json({ error: `Error processing scan: ${error.message}` });
  }
}
