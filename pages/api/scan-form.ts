// pages/api/scan-form.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import vision from '@google-cloud/vision';
import { Configuration, OpenAIApi } from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { FPDF } from 'fpdf';
import formidable, { File } from 'formidable';
import fs from 'fs';
import path from 'path';
import * as cv from 'opencv4nodejs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

// Initialize Google Vision
const visionClient = new vision.ImageAnnotatorClient();

// Initialize OpenAI
const openai = new OpenAIApi(
    new Configuration({ apiKey: process.env.OPENAI_API_KEY })
);

// Helper functions
async function googleVisionOCR(imagePath: string): Promise<string> {
    const [result] = await visionClient.textDetection(imagePath);
    const detections = result.textAnnotations;
    return detections && detections.length ? detections[0].description!.trim() : "Not found";
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

    const response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
        temperature: 0.7,
    });
    return response.data.choices[0].message?.content || "An error occurred while processing the data.";
}

function generatePDF(content: string, pdfPath: string) {
    const pdf = new FPDF();
    pdf.addPage();
    pdf.setFont("Arial", "", 12);

    content.split('\n').forEach(line => {
        pdf.cell(200, 10, line, 0, 1);
    });

    pdf.output(pdfPath);
}

async function uploadPDFToSupabase(filePath: string, fileName: string) {
    const { data, error } = await supabase.storage.from('scanned_forms').upload(`scanned_forms/${fileName}`, fs.createReadStream(filePath), {
        contentType: 'application/pdf',
    });

    if (error) throw new Error(`Error uploading PDF to Supabase: ${error.message}`);
    return data;
}

// API Route Handlers
export default async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === 'POST') {
        const form = formidable({ multiples: true, uploadDir: '/tmp' });

        form.parse(req, async (err, fields, files) => {
            if (err) {
                res.status(500).json({ error: 'Error parsing file upload' });
                return;
            }

            const file = files.file as File;
            const filePath = file.filepath;

            try {
                // Preprocess and OCR
                const preprocessedImage = cv.imread(filePath).cvtColor(cv.COLOR_BGR2GRAY).gaussianBlur(new cv.Size(5, 5), 0).convertTo(cv.CV_8U, 1.5, 0);
                cv.imwrite(filePath, preprocessedImage); // Save the processed image for OCR

                const rawText = await googleVisionOCR(filePath);
                const structuredResponse = await chatGPTClassification(rawText);

                // Send back structured response for confirmation
                res.status(200).json({ message: structuredResponse });
            } catch (error) {
                res.status(500).json({ error: `Error processing scan: ${error.message}` });
            }
        });
    } else if (req.method === 'PUT') {
        const { structuredData } = req.body;
        if (!structuredData) {
            res.status(400).json({ error: "No structured data provided" });
            return;
        }

        try {
            const pdfFilename = `confirmed_form_${uuidv4()}_${Date.now()}.pdf`;
            const pdfFilePath = path.join('/tmp', pdfFilename);

            generatePDF(structuredData, pdfFilePath);

            const uploadResponse = await uploadPDFToSupabase(pdfFilePath, pdfFilename);
            res.status(200).json({ message: "PDF saved successfully", file: uploadResponse });
        } catch (error) {
            res.status(500).json({ error: `Error saving PDF: ${error.message}` });
        }
    } else {
        res.setHeader('Allow', ['POST', 'PUT']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};

// Configurations for Next.js API Routes to parse FormData (for image upload)
export const config = {
    api: {
        bodyParser: false,
    },
};
