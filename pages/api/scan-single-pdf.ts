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
    form.parse(req, (err, fields, files: any) => {
      if (err) {
        reject(err);
        return;
      }
      
      const file = files.file?.[0];
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
          content: 'Extract a single form from the text. Return a JSON object with the form data including ERR ID, date, expenses, and financial summary.'
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

    return JSON.parse(content);
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw error;
  }
}

function transformFormData(openAIResponse: any) {
  return {
    date: openAIResponse.date || '',
    err_id: openAIResponse.err_id || '',
    expenses: openAIResponse.expenses || [],
    financial_summary: {
      total_expenses: openAIResponse.financial_summary?.total_expenses || '',
      total_grant_received: openAIResponse.financial_summary?.total_grant_received || '',
      total_other_sources: openAIResponse.financial_summary?.total_other_sources || '',
      remainder: openAIResponse.financial_summary?.remainder || ''
    },
    additional_questions: {
      excess_expenses: openAIResponse.additional_questions?.excess_expenses || '',
      surplus_use: openAIResponse.additional_questions?.surplus_use || '',
      lessons_learned: openAIResponse.additional_questions?.lessons_learned || '',
      training_needs: openAIResponse.additional_questions?.training_needs || ''
    }
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  let filePath: string | null = null;
  try {
    console.log('Parsing uploaded file...');
    const { filePath: parsedFilePath } = await parseForm(req);
    filePath = parsedFilePath;
    console.log('File parsed successfully:', filePath);

    console.log('Extracting text from PDF...');
    const extractedText = await extractTextFromPdf(filePath);
    console.log('Text extracted, length:', extractedText.length);

    console.log('Processing text with OpenAI...');
    const structuredData = await processText(extractedText);
    console.log('OpenAI response:', structuredData);

    // Transform the data to match PrefilledForm format
    const formData = transformFormData(structuredData);
    console.log('Transformed form data:', formData);

    return res.status(200).json({ 
      message: 'PDF processed successfully', 
      data: formData
    });

  } catch (error: any) {
    console.error(`Processing error:`, error);
    res.status(500).json({ error: `Error processing PDF: ${error.message}` });
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.error('Error cleaning up temporary file:', cleanupError);
      }
    }
  }
} 