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

  const openAIOutput = response.choices[0].message?.content || 'An error occurred while processing the data.';
  console.log('OpenAI Response:', openAIOutput);

  // Parse OpenAI response into structured data
  const structuredData = parseOpenAIResponse(openAIOutput);
  return structuredData;
  }

  // Function to parse OpenAI response to structured form fields
  function parseOpenAIResponse(response: string) {
    const structuredData = {
      date: '',
      err_id: '',  // matches frontend expectation
      expenses: [],  // matches frontend expectation
      total_grant: '',
      total_other_sources: '',
      total_expenses: '',
      remainder: '',
      additional_excess_expenses: '',
      additional_surplus_use: '',
      lessons_learned: '',
      additional_training_needs: '',
    };

    // Extract data based on expected format
    const dateMatch = response.match(/Date:\s*(\d{2}\/\d{2}\/\d{2})/);
    const errNumberMatch = response.match(/ERR Number:\s*(\d+)/);

    structuredData.date = dateMatch ? dateMatch[1] : '';
    structuredData.err_id = errNumberMatch ? errNumberMatch[1] : '';  // Corrected to `err_id`

    // Extract activities in the activity table
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

    // Extract financial summary as flat fields
    const totalExpensesMatch = response.match(/Total Expenses in SDG:\s*(\d+)/);
    const totalGrantReceivedMatch = response.match(/Total Grant Received:\s*(\d+)/);
    const totalOtherSourcesMatch = response.match(/Total Amount from Other Sources:\s*(\d+)/);
    const remainderMatch = response.match(/Remainder:\s*(\d+)/);

    structuredData.total_expenses = totalExpensesMatch ? totalExpensesMatch[1] : '';
    structuredData.total_grant = totalGrantReceivedMatch ? totalGrantReceivedMatch[1] : '';
    structuredData.total_other_sources = totalOtherSourcesMatch ? totalOtherSourcesMatch[1] : '';
    structuredData.remainder = remainderMatch ? remainderMatch[1] : '';

    // Extract additional questions as flat fields
    const excessExpensesMatch = response.match(/excess expenses\?\s*(.+)/);
    const surplusUseMatch = response.match(/surplus if expenses were less than the grant received\?\s*(.+)/);
    const lessonsLearnedMatch = response.match(/budget planning\?\s*(.+)/);
    const trainingNeedsMatch = response.match(/training needs or opportunities\?\s*(.+)/);

    structuredData.additional_excess_expenses = excessExpensesMatch ? excessExpensesMatch[1] : '';
    structuredData.additional_surplus_use = surplusUseMatch ? surplusUseMatch[1] : '';
    structuredData.lessons_learned = lessonsLearnedMatch ? lessonsLearnedMatch[1] : '';
    structuredData.additional_training_needs = trainingNeedsMatch ? trainingNeedsMatch[1] : '';

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
