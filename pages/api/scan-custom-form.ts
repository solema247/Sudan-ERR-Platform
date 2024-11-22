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
async function parseForm(req: NextApiRequest): Promise<{ filePath: string; fileName: string }> {
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

  const form = formidable({ multiples: false, keepExtensions: true, uploadDir });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        console.error("Error parsing form:", err);
        reject(err);
      }

      const uploadedFiles = files['file'];
      let file: formidable.File;

      if (Array.isArray(uploadedFiles)) {
        file = uploadedFiles[0]; // Correctly access the first file
      } else {
        file = uploadedFiles;
      }

      if (!file) {
        console.error("No file found in the form submission");
        reject(new Error("No file uploaded"));
      } else {
        console.log("File parsed successfully:", file.originalFilename);
        resolve({ filePath: file.filepath, fileName: file.originalFilename || "uploaded_image" });
      }
    });
  });
}

// Preprocess the image for OCR
async function preprocessImage(imagePath: string): Promise<Buffer> {
  console.log('Preprocessing image:', imagePath);
  return sharp(imagePath)
    .grayscale()
    .modulate({ brightness: 1.2, contrast: 1.5 })
    .jpeg({ quality: 90 })
    .toBuffer();
}

// Perform OCR using Google Vision
async function googleVisionOCR(imageBuffer: Buffer): Promise<string> {
  const [result] = await visionClient.textDetection({
    image: { content: imageBuffer },
    imageContext: { languageHints: ['en', 'ar'] },
  });
  const detections = result.textAnnotations;
  const ocrText = detections?.[0]?.description?.trim() || '';
  console.log('Google Vision OCR Output:', ocrText);
  return ocrText;
}

// Detect language from OCR text
function detectLanguage(ocrText: string): string {
  const langCode = franc(ocrText);
  console.log('Detected language code:', langCode);

  // Check for Arabic script explicitly as a fallback
  const containsArabic = /[\u0600-\u06FF]/.test(ocrText); // Arabic Unicode range
  if (containsArabic) return 'ar';

  if (langCode === 'ara') return 'ar';
  if (langCode === 'eng') return 'en';
  return 'ar'; // Default to Arabic if uncertain
}

// Load localized prompt based on language
function getPromptForLanguage(language: string, cleanedText: string): string {
  const promptFilePath = path.join(process.cwd(), 'public/locales', language, 'custom-prompts.json');
  try {
    const promptData = JSON.parse(fs.readFileSync(promptFilePath, 'utf8'));
    return promptData.prompt.replace('${cleanedText}', cleanedText);
  } catch (error) {
    console.error(`Error loading custom-prompts.json for language: ${language}`, error);
    throw new Error(`Failed to load custom-prompts.json for language: ${language}`);
  }
}

// Classify text using OpenAI GPT
async function classifyWithChatGPT(language: string, ocrText: string): Promise<any> {
  const cleanedText = ocrText.replace(/[\n\r]+/g, ' ').trim();
  const prompt = getPromptForLanguage(language, cleanedText);

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
    .from('scanned_forms') // Replace with your Supabase storage bucket name
    .upload(`uploads/${Date.now()}-${fileName}`, fileBuffer, {
      cacheControl: '3600',
      upsert: false,
      contentType: 'image/jpeg',
    });

  if (error) {
    console.error('Error uploading to Supabase:', error.message);
    throw new Error('File upload to Supabase failed');
  }

  // Generate public URL
  const { publicUrl } = supabase.storage.from('scanned_forms').getPublicUrl(data.path);
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
    // Parse uploaded file
    const { filePath, fileName } = await parseForm(req);
    console.log('File uploaded at:', filePath);

    // Preprocess image and extract OCR text
    const processedImage = await preprocessImage(filePath);
    const ocrText = await googleVisionOCR(processedImage);

    // Detect language and classify text
    const detectedLanguage = detectLanguage(ocrText);
    console.log('Detected Language:', detectedLanguage);
    const structuredData = await classifyWithChatGPT(detectedLanguage, ocrText);

    // Upload the file to Supabase
    const publicFileUrl = await uploadToSupabase(filePath, fileName);

    // Return response
    res.status(200).json({
      message: 'Scan processed successfully.',
      ocrText,
      structuredData: structuredData || {},
      fileUrl: publicFileUrl,
    });

    // Clean up temporary file
    fs.unlinkSync(filePath);
  } catch (error: any) {
    console.error('Error processing scan:', error.message);
    res.status(500).json({ 
        error: `Processing error: ${error.message || "Unknown error"}`,
        details: error.stack, // Include stack trace for debugging
    });
  }
}

