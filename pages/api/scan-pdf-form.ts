import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import os from 'os';
import vision from '@google-cloud/vision';
import OpenAI from 'openai';
import { franc } from 'franc';
import pdf from 'pdf-parse';
import { supabase } from '../../services/supabaseClient';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: process.env.MAX_BODY_SIZE || '10mb'
    }
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

async function downloadFile(url: string): Promise<string> {
  try {
    // Get the file path from the URL - Supabase URLs look like: 
    // https://<project>.supabase.co/storage/v1/object/public/pdf-uploads/path/to/file.pdf
    const pathMatch = url.match(/\/storage\/v1\/object\/public\/pdf-uploads\/(.*)/);
    if (!pathMatch) throw new Error('Invalid Supabase storage URL format');
    
    const filePath = pathMatch[1];
    console.log('Attempting to download:', filePath);

    const { data, error } = await supabase
      .storage
      .from('pdf-uploads')
      .download(filePath);

    if (error) throw error;
    if (!data) throw new Error('No data received from storage');

    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `${Date.now()}.pdf`);
    
    fs.writeFileSync(tmpFile, Buffer.from(await data.arrayBuffer()));
    console.log('File downloaded successfully to:', tmpFile);
    
    return tmpFile;
  } catch (error) {
    console.error('Download error:', error);
    throw new Error(`Failed to download file: ${error.message}`);
  }
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
          content: 'Extract all forms from the text. Return a JSON object with a "forms" array containing all detected forms. Each form should have ERR ID, date, expenses, and financial summary. Always return an array of forms, even if there is only one form.'
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
    const { fileUrl } = req.body;
    if (!fileUrl) {
      throw new Error('No file URL provided');
    }

    // Download file from Supabase
    filePath = await downloadFile(fileUrl);

    const extractedText = await extractTextFromPdf(filePath);
    const structuredData = await processText(extractedText);

    return res.status(200).json({ 
      message: 'PDF processed successfully', 
      forms: structuredData.forms
    });

  } catch (error: any) {
    console.error(`Processing error:`, error);
    res.status(500).json({ error: `Error processing PDF: ${error.message}` });
  } finally {
    // Clean up temporary file
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.error('Error cleaning up temporary file:', cleanupError);
      }
    }
  }
} 