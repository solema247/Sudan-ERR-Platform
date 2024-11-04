// pages/api/scan-form.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import vision from '@google-cloud/vision';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

// Initialize Google Vision using the JSON file in the root directory
const visionClient = new vision.ImageAnnotatorClient({
  keyFilename: path.join(process.cwd(), 'local-humanitarian-web-chat-1f81cd59311e.json'), // Path to your credentials file
});

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Helper functions
async function googleVisionOCR(imagePath: string): Promise<string> {
  try {
    const [result] = await visionClient.textDetection(imagePath);
    const detections = result.textAnnotations;

    // Log the raw text from Google Vision OCR for debugging
    const ocrText = detections && detections.length ? detections[0].description!.trim() : 'Not found';
    console.log("Google Vision OCR Output:", ocrText); // Log OCR output
    return ocrText;
  } catch (error: any) {
    throw new Error(`Google Vision OCR failed: ${error.message}`);
  }
}

function cleanExtractedText(rawText: string): string {
  return rawText.replace(/[\n\r]+/g, ' ').trim();
}

async function chatGPTClassification(rawText: string): Promise<string> {
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

  console.log("Prompt sent to OpenAI:", prompt); // Log prompt for OpenAI

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1000,
    temperature: 0.7,
  });

  const openAIOutput = response.choices[0].message?.content || 'An error occurred while processing the data.';
  console.log("OpenAI Response:", openAIOutput); // Log OpenAI response
  return openAIOutput;
}

// Disable Next.js's default body parsing to allow for custom file parsing
export const config = {
  api: {
    bodyParser: false,
  },
};

// Utility function to parse the multipart/form-data request
async function parseMultipartFormData(req: NextApiRequest): Promise<{ filePath: string }> {
  return new Promise((resolve, reject) => {
    const tempDir = '/tmp';
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const chunks: Uint8Array[] = [];
    req.on('data', (chunk) => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const boundary = req.headers['content-type']?.split('boundary=')[1];
      if (!boundary) return reject(new Error('Boundary not found in request headers'));

      // Split the buffer on the boundary to isolate the file content
      const parts = buffer.toString().split(`--${boundary}`);
      const filePart = parts.find((part) => part.includes('filename="'));
      if (!filePart) return reject(new Error('File part not found'));

      const filenameMatch = /filename="(.+?)"/.exec(filePart);
      const filename = filenameMatch ? filenameMatch[1] : `upload-${Date.now()}.jpg`;
      const filePath = path.join(tempDir, filename);

      // Extract the binary data of the file
      const fileData = filePart.split('\r\n\r\n')[1];
      const fileBuffer = Buffer.from(fileData, 'binary');

      // Save the file to the filesystem
      fs.writeFileSync(filePath, fileBuffer);
      resolve({ filePath });
    });

    req.on('error', (error) => reject(error));
  });
}

// API Route Handler
export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { filePath } = await parseMultipartFormData(req);

    // Perform OCR and classification
    const rawText = await googleVisionOCR(filePath);
    const structuredResponse = await chatGPTClassification(rawText);

    // Send the structured response back to the client
    res.status(200).json({ message: structuredResponse });

    // Clean up the uploaded file
    fs.unlinkSync(filePath);
  } catch (error: any) {
    console.error(`Processing error: ${error.message}`);
    res.status(500).json({ error: `Error processing scan: ${error.message}` });
  }
};
