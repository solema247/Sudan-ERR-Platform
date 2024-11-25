//pages/api/scan-custom-form.ts
import { NextApiRequest, NextApiResponse } from 'next';
import vision from '@google-cloud/vision';
import OpenAI from 'openai';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import formidable from 'formidable';
import { franc } from 'franc';
import { createClient } from '@supabase/supabase-js';

// Disable body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// Initialize Google Vision client
const visionClient = new vision.ImageAnnotatorClient({
  credentials: JSON.parse(process.env.GOOGLE_VISION!),
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

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

      const projectId = fields['projectId'] as string;

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
  console.log('Preprocessing image:', imagePath);
  return sharp(imagePath)
    .grayscale()
    .sharpen() // Add sharpening for better text edge clarity
    .modulate({ brightness: 1.2, contrast: 1.5 })
    .withMetadata() // Retain orientation metadata
    .jpeg({ quality: 90 })
    .toBuffer();
}

// Perform OCR using Google Vision
function reconstructTextWithLayout(fullTextAnnotation: any): string {
  let text = '';
  for (const page of fullTextAnnotation.pages) {
    for (const block of page.blocks) {
      // Log bounding box coordinates for debugging
      console.log(
        `Block detected at (${block.boundingBox.vertices
          .map((v: any) => `${v.x},${v.y}`)
          .join(' - ')})`
      );

      // Sort paragraphs by vertical position
      const sortedParagraphs = block.paragraphs.sort((a: any, b: any) => {
        return a.boundingBox.vertices[0].y - b.boundingBox.vertices[0].y;
      });

      let blockText = '';
      for (const paragraph of sortedParagraphs) {
        // Log paragraph bounding box details
        console.log(
          `Paragraph at (${paragraph.boundingBox.vertices
            .map((v: any) => `${v.x},${v.y}`)
            .join(' - ')})`
        );

        let paragraphText = '';
        for (const word of paragraph.words.reverse()) { // Reverse for RTL
          const wordText = word.symbols.map((s: any) => s.text).join('');
          paragraphText += wordText + ' ';
        }
        blockText += paragraphText.trim() + '\n';
      }
      text += blockText.trim() + '\n\n';
    }
  }
  return text.trim();
}

// Updated OCR Function
async function googleVisionOCR(imageBuffer: Buffer): Promise<string> {
  const [result] = await visionClient.documentTextDetection({
    image: { content: imageBuffer },
    imageContext: { languageHints: ['en', 'ar'] },
  });

  const fullTextAnnotation = result.fullTextAnnotation;
  if (!fullTextAnnotation) {
    console.log('No text detected.');
    return '';
  }

  const reconstructedText = reconstructTextWithLayout(fullTextAnnotation);
  console.log('Google Vision OCR Output:', reconstructedText);
  return reconstructedText;
}



// Detect language from OCR text
function detectLanguage(ocrText: string): string {
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

    // Safely extract project details with fallback for missing fields
    const projectObjectives = projectMetadata?.project_objectives || "Not provided";
    const beneficiaries = projectMetadata?.intended_beneficiaries || "Not provided";
    const errId = projectMetadata?.err || "Not provided";
    const activities = Array.isArray(projectMetadata?.planned_activities)
      ? projectMetadata.planned_activities
          .map((a: any) => `${a.selectedOption || "Unknown"} at ${a.placeOfOperation || "Unknown location"}`)
          .join(', ')
      : "Not provided";

    // Calculated financial summary fields
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
      .replace('${expenses.activity}', activities); // Include activity from metadata
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

  // Perform calculations
  const totalGrantReceived = (projectMetadata.expenses || []).reduce((sum: number, expense: any) => {
    const frequency = parseFloat(expense.frequency) || 0;
    const unitPrice = parseFloat(expense.unitPrice) || 0;
    return sum + (unitPrice * frequency);
  }, 0);

  // Placeholder for totalExpenses (will be calculated after OpenAI response)
  const totalExpenses = 0;
  const remainder = totalGrantReceived - totalExpenses;

  const calculatedFields = {
    totalGrantReceived,
    totalExpenses,
    remainder
  };

  const cleanedText = ocrText.replace(/[\n\r]+/g, ' ').trim();
  const prompt = getPromptForLanguage(language, cleanedText, projectMetadata, calculatedFields);

  console.log('Prompt sent to OpenAI:', prompt);

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1500,
    temperature: 0.7,
  });

  const openAIOutput = response.choices[0]?.message?.content || '{}';
  console.log('OpenAI Response:', openAIOutput);

  return JSON.parse(openAIOutput);
}

// Upload file to Supabase Storage
async function uploadToSupabase(filePath: string, fileName: string): Promise<string> {
  const fileBuffer = fs.readFileSync(filePath);
  const { data, error } = await supabase.storage
    .from('expense-reports')
    .upload(`custom-reports/${Date.now()}-${fileName}`, fileBuffer, {
      cacheControl: '3600',
      upsert: false,
      contentType: 'image/jpeg',
    });

  if (error) {
    console.error('Error uploading to Supabase:', error.message);
    throw new Error('File upload to Supabase failed');
  }

  const { publicUrl } = supabase.storage.from('expense-reports').getPublicUrl(data.path);
  console.log('File uploaded to Supabase with URL:', publicUrl);
  return publicUrl;
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

    // Perform initial calculations for totalGrantReceived
    const totalGrantReceived = projectMetadata.expenses.reduce((sum: number, expense: any) => {
      const frequency = parseFloat(expense.frequency) || 0;
      const unitPrice = parseFloat(expense.unitPrice) || 0;
      return sum + (unitPrice * frequency);
    }, 0);

    const calculatedFields = {
      totalGrantReceived,
      totalExpenses: 0, // Will be calculated after OpenAI response
      remainder: 0      // Will be updated later
    };

    const structuredData = await classifyWithChatGPT(detectedLanguage, ocrText, projectMetadata, calculatedFields);

    // Calculate totalExpenses from structuredData.expenses
    const totalExpenses = (structuredData.expenses || []).reduce((sum: number, expense: any) => {
      return sum + (parseFloat(expense.amount) || 0);
    }, 0);

    // Recalculate remainder
    const remainder = totalGrantReceived - totalExpenses;

    // Update structuredData.financial_summary
    structuredData.financial_summary = structuredData.financial_summary || {};
    structuredData.financial_summary.total_expenses = totalExpenses.toString();
    structuredData.financial_summary.total_grant_received = totalGrantReceived.toString();
    structuredData.financial_summary.remainder = remainder.toString();

    // Include ERR ID from metadata if not present
    if (!structuredData.err_id || structuredData.err_id === "غير متوفر" || structuredData.err_id === "Not available") {
      structuredData.err_id = projectMetadata.err || "Not available";
    }

    // Define activities for use in expenses
    const activities = Array.isArray(projectMetadata?.planned_activities)
      ? projectMetadata.planned_activities
          .map((a: any) => `${a.selectedOption || "Unknown"} at ${a.placeOfOperation || "Unknown location"}`)
          .join(', ')
      : "Not provided";

    // Include activity from metadata if missing
    if (structuredData.expenses && structuredData.expenses.length > 0) {
      if (structuredData.expenses && structuredData.expenses.length > 0) {
        structuredData.expenses.forEach((expense: any) => {
          if (!expense.activity || expense.activity.trim() === "" || 
              expense.activity === "غير متوفر" || 
              expense.activity === "Not available") {
            expense.activity = activities; // Use activities from metadata
          }
        });
      }
    }

    // Enrich data with projectMetadata
    const enrichedData = {
      ...structuredData,
      projectMetadata,
    };

    const publicFileUrl = await uploadToSupabase(filePath, fileName);

    res.status(200).json({
      message: 'Scan processed successfully.',
      ocrText,
      structuredData: enrichedData,
      fileUrl: publicFileUrl,
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

