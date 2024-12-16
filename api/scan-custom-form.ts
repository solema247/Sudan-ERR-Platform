import { NextApiRequest, NextApiResponse } from 'next';
import vision from '@google-cloud/vision';
import OpenAI from 'openai';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import formidable from 'formidable';
import { franc } from 'franc';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

// Disable body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// Initialize Google Vision client
const googleVisionCredentials = JSON.parse(process.env.GOOGLE_VISION!);
googleVisionCredentials.private_key = googleVisionCredentials.private_key.replace(/\\n/g, '\n');

const visionClient = new vision.ImageAnnotatorClient({
  credentials: googleVisionCredentials,
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Parse multipart form-data
async function parseForm(req: NextApiRequest): Promise<{ filePath: string; fileName: string; projectId: string }> {
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

  const form = formidable({ multiples: false, keepExtensions: true, uploadDir });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        console.error("Error parsing form:", err);
        reject(err);
        return;
      }

      const uploadedFiles = files['file'];
      let file: formidable.File;

      if (Array.isArray(uploadedFiles)) {
        file = uploadedFiles[0];
      } else {
        file = uploadedFiles;
      }

      if (!file) {
        console.error("No file found in the form submission");
        reject(new Error("No file uploaded"));
        return;
      }

      const projectId = fields['projectId'] as unknown as string;

      if (!projectId) {
        console.error("Project ID is missing from the form submission");
        reject(new Error("Project ID is required"));
        return;
      }

      console.log("File parsed successfully:", file.originalFilename);
      resolve({
        filePath: file.filepath,
        fileName: file.originalFilename || "uploaded_image",
        projectId,
      });
    });
  });
}

// Fetch project metadata from Supabase
async function fetchProjectMetadata(projectId: string) {
  console.log('Fetching metadata for project:', projectId);
  const { data, error } = await supabase
    .from('err_projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error) {
    console.error('Error fetching project metadata:', error.message);
    throw new Error('Failed to fetch project metadata');
  }

  console.log('Project metadata retrieved:', data);
  return data;
}

// Preprocess the image for OCR
async function preprocessImage(imagePath: string): Promise<Buffer> {
  const outputPath = `${imagePath}_processed.png`;

  try {
    const preprocessScriptPath = path.join(__dirname, 'preprocess.py');
    execSync(`python ${preprocessScriptPath} ${imagePath} ${outputPath}`, { stdio: 'inherit' });

    return fs.readFileSync(outputPath);
  } catch (error) {
    console.error('Error during image preprocessing:', error);
    throw new Error('Image preprocessing failed.');
  } finally {
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
  }
}

// Perform OCR using Google Vision
function reconstructTextWithLayout(fullTextAnnotation: any): string {
  let rows: { y: number; x: number; text: string }[] = [];

  for (const page of fullTextAnnotation.pages) {
    for (const block of page.blocks) {
      for (const paragraph of block.paragraphs) {
        for (const word of paragraph.words) {
          const wordText = word.symbols.map((s: any) => s.text).join('');
          const y = word.boundingBox.vertices[0].y;
          const x = word.boundingBox.vertices[0].x;
          rows.push({ y, x, text: wordText });
        }
      }
    }
  }

  const groupedRows = rows
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .reduce((acc: { y: number; rowText: string }[], word) => {
      const lastRow = acc[acc.length - 1];
      if (lastRow && Math.abs(lastRow.y - word.y) < 15) {
        lastRow.rowText += ` ${word.text}`;
      } else {
        acc.push({ y: word.y, rowText: word.text });
      }
      return acc;
    }, []);

  return groupedRows
    .map((row) => row.rowText)
    .join('\n');
}

// Updated OCR Function
async function googleVisionOCR(imageBuffer: Buffer): Promise<string> {
  const [result] = await visionClient.documentTextDetection({
    image: { content: imageBuffer },
    imageContext: { languageHints: ['ar', 'en'] },
  });

  const fullTextAnnotation = result.fullTextAnnotation;
  if (!fullTextAnnotation) {
    console.log('No text detected.');
    return '';
  }

  const reconstructedText = reconstructTextWithLayout(fullTextAnnotation);
  console.log('Grouped OCR Output:', reconstructedText);
  return reconstructedText;
}

// Detect language from OCR text
function detectLanguage(ocrText: string): string {
  ocrText = ocrText.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());

  const langCode = franc(ocrText);
  console.log('Detected language code:', langCode);

  const containsArabic = /[\u0600-\u06FF]/.test(ocrText);
  if (containsArabic) return 'ar';

  if (langCode === 'ara') return 'ar';
  if (langCode === 'eng') return 'en';
  return 'ar';
}

// Function to generate the prompt with validation
function getPromptForLanguage(language: string, cleanedText: string, projectMetadata: any, calculatedFields: any): string {
  const promptFilePath = path.join(process.cwd(), 'public/locales', language, 'custom-prompts.json');
  try {
    const promptData = JSON.parse(fs.readFileSync(promptFilePath, 'utf8'));

    const projectObjectives = projectMetadata?.project_objectives || "Not provided";
    const beneficiaries = projectMetadata?.intended_beneficiaries || "Not provided";
    const errId = projectMetadata?.err || "Not provided";
    const activities = Array.isArray(projectMetadata?.planned_activities)
      ? projectMetadata.planned_activities
          .map((a: any) => `${a.selectedOption || "Unknown"} at ${a.placeOfOperation || "Unknown location"}`)
          .join(', ')
      : "Not provided";

    const totalGrantReceived = calculatedFields.totalGrantReceived.toString();
    const totalExpenses = calculatedFields.totalExpenses.toString();
    const remainder = calculatedFields.remainder.toString();

    return promptData.prompt
      .replace('${cleanedText}', cleanedText)
      .replace('${projectMetadata.project_objectives}', projectObjectives)
      .replace('${projectMetadata.intended_beneficiaries}', beneficiaries)
      .replace('${projectMetadata.err_id}', errId)
      .replace('${financial_summary.total_grant_received}', totalGrantReceived)
      .replace('${financial_summary.total_expenses}', totalExpenses)
      .replace('${financial_summary.remainder}', remainder)
      .replace('${expenses.activity}', activities)
      .replace('${table_processing}', "Detect and structure tables by identifying columns (e.g., Item, Quantity, Price) and rows.")
      .replace('${metadata_hint}', "Ensure metadata fields like 'Project Objectives' and 'Beneficiaries' are linked correctly.");
  } catch (error) {
    console.error(`Error loading custom-prompts.json for language: ${language}`, error);
    throw new Error(`Failed to load custom-prompts.json for language: ${language}`);
  }
}

// Function to classify text with OpenAI and project metadata
async function classifyWithChatGPT(language: string, ocrText: string, projectMetadata: any): Promise<any> {
  if (!projectMetadata) {
    throw new Error("Project metadata is missing or undefined");
  }

  const totalGrantReceived = (projectMetadata.expenses || []).reduce((sum: number, expense: any) => {
    const frequency = parseFloat(expense.frequency) || 0;
    const unitPrice = parseFloat(expense.unitPrice) || 0;
    return sum + (unitPrice * frequency);
  }, 0);

  const totalExpenses = 0;
  const remainder = totalGrantReceived - totalExpenses;

  const calculatedFields = {
    totalGrantReceived,
    totalExpenses,
    remainder
  };

  const cleanedText = ocrText
    .replace(/[\u0000-\u001F]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const prompt = getPromptForLanguage(language, cleanedText, projectMetadata, calculatedFields);

  console.log('Prompt sent to OpenAI:', prompt);

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1500,
    temperature: 0,
  });

  const openAIOutput = response.choices[0]?.message?.content || '{}';
  console.log('OpenAI Response (raw):', openAIOutput);

  let parsedOutput;
  try {
    parsedOutput = JSON.parse(openAIOutput);
  } catch (error) {
    console.error('Error parsing OpenAI response as JSON:', error);
    console.error('Raw OpenAI Response:', openAIOutput);

    throw new Error('Invalid JSON response from OpenAI.');
  }

  return parsedOutput;
}

// Upload file to Supabase Storage
async function uploadToSupabase(filePath: string, fileName: string): Promise<string> {
  const fileBuffer = fs.readFileSync(filePath);
  const uploadPath = `custom-reports/${Date.now()}-${fileName}`;

  const { data, error } = await supabase.storage
    .from('expense-reports')
    .upload(uploadPath, fileBuffer, {
      cacheControl: '3600',
      upsert: false,
      contentType: 'image/jpeg',
    });

  if (error) {
    console.error('Error uploading to Supabase:', error.message);
    throw new Error('File upload to Supabase failed');
  }

  if (!data || !data.path) {
    console.error('Error: Upload succeeded but file path is missing in response');
    throw new Error('Failed to retrieve the uploaded file path from Supabase');
  }

  const { data: publicUrlData } = supabase.storage
    .from('expense-reports')
    .getPublicUrl(uploadPath);

  if (!publicUrlData || !publicUrlData.publicUrl) {
    console.error('Error: Public URL generation failed.');
    throw new Error('Failed to generate public URL for uploaded file');
  }

  console.log('File uploaded to Supabase with URL:', publicUrlData.publicUrl);
  return publicUrlData.publicUrl;
}

// API Route Handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { filePath, fileName, projectId } = await parseForm(req);

    if (!projectId) {
      throw new Error('Project ID is required');
    }

    const projectMetadata = await fetchProjectMetadata(projectId);

    const processedImage = await preprocessImage(filePath);
    const ocrText = await googleVisionOCR(processedImage);

    const detectedLanguage = detectLanguage(ocrText);

    const totalGrantReceived = projectMetadata.expenses.reduce((sum: number, expense: any) => {
      const frequency = parseFloat(expense.frequency) || 0;
      const unitPrice = parseFloat(expense.unitPrice) || 0;
      return sum + (unitPrice * frequency);
    }, 0);

    const calculatedFields = {
      totalGrantReceived,
      totalExpenses: 0,
      remainder: 0
    };

    const structuredData = await classifyWithChatGPT(detectedLanguage, ocrText, projectMetadata);

    const totalExpenses = (structuredData.expenses || []).reduce((sum: number, expense: any) => {
      return sum + (parseFloat(expense.amount) || 0);
    }, 0);

    const remainder = totalGrantReceived - totalExpenses;

    structuredData.financial_summary = structuredData.financial_summary || {};
    structuredData.financial_summary.total_expenses = totalExpenses.toString();
    structuredData.financial_summary.total_grant_received = totalGrantReceived.toString();
    structuredData.financial_summary.remainder = remainder.toString();

    if (!structuredData.err_id || structuredData.err_id === "غير متوفر" || structuredData.err_id === "Not available") {
      structuredData.err_id = projectMetadata.err || "Not available";
    }

    const activities = Array.isArray(projectMetadata?.planned_activities)
      ? projectMetadata.planned_activities
          .map((a: any) => `${a.selectedOption || "Unknown"} at ${a.placeOfOperation || "Unknown location"}`)
          .join(', ')
      : "Not provided";

    if (structuredData.expenses && structuredData.expenses.length > 0) {
      structuredData.expenses.forEach((expense: any) => {
        if (!expense.activity || expense.activity.trim() === "" || 
            expense.activity === "غير متوفر" || 
            expense.activity === "Not available") {
          expense.activity = activities;
        }
      });
    }

    const publicFileUrl = await uploadToSupabase(filePath, fileName);

    const enrichedData = {
      ...structuredData,
      projectMetadata,
      fileUrl: publicFileUrl,
    };

    res.status(200).json({
      message: 'Scan processed successfully.',
      ocrText,
      structuredData: enrichedData,
    });

    fs.unlinkSync(filePath);
  } catch (error: any) {
    console.error('Error processing scan:', error.message);
    res.status(500).json({
      error: `Processing error: ${error.message || 'Unknown error'}`,
      details: error.stack,
    });
  }
} 