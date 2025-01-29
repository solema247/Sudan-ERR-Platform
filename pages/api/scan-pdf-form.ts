import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import os from 'os';
import vision from '@google-cloud/vision';
import OpenAI from 'openai';
import { franc } from 'franc';
import pdf from 'pdf-parse';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Initialize clients (reuse from scan-form.ts)
const visionClient = new vision.ImageAnnotatorClient({
  credentials: (() => {
    const creds = JSON.parse(process.env.GOOGLE_VISION!);
    creds.private_key = creds.private_key.replace(/\\n/g, '\n');
    return creds;
  })(),
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

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
      const file = files.file[0] as formidable.File;
      if (!file) {
        reject(new Error('No file uploaded'));
        return;
      }
      resolve({ filePath: file.filepath });
    });
  });
}

async function extractTextFromPdf(pdfPath: string): Promise<string> {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdf(dataBuffer);
    
    // Extract text from first few pages (approximately)
    const text = data.text;
    const pages = text.split('\n\n\f\n\n'); // PDF page breaks
    const firstPages = pages.slice(0, 3).join('\n\n');
    
    return firstPages;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw error;
  }
}

function cleanJsonString(str: string): string {
  // Remove any text before the first {
  const startIndex = str.indexOf('{');
  const endIndex = str.lastIndexOf('}') + 1;
  if (startIndex === -1 || endIndex === 0) {
    throw new Error('No valid JSON object found in response');
  }
  return str.slice(startIndex, endIndex);
}

async function processText(text: string): Promise<any> {
  const langCode = franc(text);
  const detectedLanguage = langCode === 'ara' ? 'ar' : 'en';

  const promptPath = path.join(process.cwd(), 'public', 'locales', detectedLanguage, 'pdf-prompts.json');
  const promptData = JSON.parse(fs.readFileSync(promptPath, 'utf-8'));
  const prompt = promptData.prompt.replace('${cleanedText}', text);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a JSON formatter. Always respond with valid JSON only. Never include comments, ellipses, or any text outside of the JSON structure. Numbers should be unquoted.'
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 4000,
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    // Log the raw response for debugging
    console.log('Raw OpenAI response:', content);

    try {
      // Validate JSON before parsing
      const parsed = JSON.parse(content);
      return parsed;
    } catch (parseError) {
      console.error('JSON Parse Error. Content:', content);
      throw new Error(`Failed to parse OpenAI response as JSON: ${parseError.message}`);
    }
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw error;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  let filePath: string | null = null;
  try {
    // Parse and save uploaded PDF
    const { filePath: parsedFilePath } = await parseForm(req);
    filePath = parsedFilePath;

    // Extract text from PDF
    const extractedText = await extractTextFromPdf(filePath);
    
    // Log extracted text for debugging
    console.log('Extracted text from PDF:', extractedText);

    // Process text with OpenAI
    const structuredData = await processText(extractedText);

    res.status(200).json({ message: 'PDF processed successfully', data: structuredData });

  } catch (error: any) {
    console.error(`Processing error:`, error);
    res.status(500).json({ error: `Error processing PDF: ${error.message}` });
  } finally {
    // Clean up temporary files
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.error('Error cleaning up temporary file:', cleanupError);
      }
    }
  }
} 