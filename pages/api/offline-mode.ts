// pages/api/offline-mode.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Helper function to generate unique report ID
function generateErrReportId(err_id: string): string {
  const prefix = err_id.slice(0, 3);
  const randomDigits = crypto.randomInt(10000, 99999);
  return `${prefix}${randomDigits}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { formData, expenses, file } = req.body;

    // Validate required fields
    if (!formData || !formData.err_id || !formData.date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const err_report_id = generateErrReportId(formData.err_id);

    // Calculate total expenses if not provided
    const total_expenses = formData.total_expenses
      ? parseFloat(formData.total_expenses)
      : expenses.reduce((acc: number, exp: any) => acc + (parseFloat(exp.amount) || 0), 0);

    // Insert summary data into the Supabase table
    const { error: summaryError } = await supabase
      .from('MAG F4 Summary')
      .insert([
        {
          err_id: formData.err_id,
          err_report_id,
          report_date: formData.date,
          total_grant: parseFloat(formData.total_grant) || 0,
          total_other_sources: parseFloat(formData.total_other_sources) || 0,
          total_expenses: total_expenses,
          excess_expenses: formData.additional_excess_expenses || '',
          surplus_use: formData.additional_surplus_use || '',
          training: formData.additional_training_needs || '',
          lessons: formData.lessons || '',
          created_at: new Date().toISOString(),
        },
      ]);

    if (summaryError) {
      console.error('Error inserting summary data:', summaryError.message);
      throw new Error('Failed to insert summary data');
    }

    // Insert each expense entry
    for (const expense of expenses) {
      const {
        activity,
        description,
        payment_date,
        seller,
        payment_method,
        receipt_no,
        amount,
      } = expense;

      // Skip incomplete expense entries
      if (
        !activity ||
        !description ||
        !payment_date ||
        !seller ||
        !receipt_no ||
        !amount ||
        !payment_method
      ) {
        continue;
      }

      const { error: expenseError } = await supabase
        .from('MAG F4 Expenses')
        .insert([
          {
            err_report_id,
            expense_activity: activity,
            expense_description: description,
            payment_date,
            seller,
            payment_method,
            receipt_no,
            expense_amount: parseFloat(amount) || 0,
          },
        ]);

      if (expenseError) {
        console.error('Error inserting expense data:', expenseError.message);
        throw new Error('Failed to insert expense data');
      }
    }

    // Handle file upload if present
    if (file && file.content && file.name && file.type) {
      // Decode base64 content
      const buffer = Buffer.from(file.content, 'base64');

      // Generate unique filename
      const uniqueFileName = `reports/${crypto.randomUUID()}-${file.name}`;

      // Upload to Supabase storage bucket 'expense-reports'
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('expense-reports')
        .upload(uniqueFileName, buffer, {
          contentType: file.type,
        });

      if (uploadError) {
        console.error('Error uploading file:', uploadError.message);
        throw new Error('Failed to upload file');
      }

      // Get public URL of the uploaded file
      const { publicURL, error: publicUrlError } = supabase.storage
        .from('expense-reports')
        .getPublicUrl(uniqueFileName);

      if (publicUrlError) {
        console.error('Error getting public URL:', publicUrlError.message);
        throw new Error('Failed to get public URL of the uploaded file');
      }

      // Update the summary record with the file URL
      const { error: updateError } = await supabase
        .from('MAG F4 Summary')
        .update({ files: publicURL })
        .eq('err_report_id', err_report_id);

      if (updateError) {
        console.error('Error updating summary with file URL:', updateError.message);
        throw new Error('Failed to update summary with file URL');
      }
    }

    // Clear the offlineSessionQueue in localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('offlineSessionQueue');
    }

    res.status(200).json({ message: 'Form submitted successfully!' });
  } catch (error: any) {
    console.error('Error processing submission:', error.message || error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

