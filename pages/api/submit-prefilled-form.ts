// pages/api/submit-prefilled-form.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const {
      err_id,
      date,
      total_grant,
      total_other_sources,
      additional_excess_expenses,
      additional_surplus_use,
      lessons_learned,
      additional_training_needs,
      expenses,
      files = []
    } = req.body;

    // Generate a unique report ID using err_id and timestamp as a fallback
    const err_report_id = `${err_id || 'UNKNOWN'}-${Date.now()}`;

    // Calculate total expenses if not provided
    const total_expenses = expenses.reduce((acc: number, exp: any) => acc + (parseFloat(exp.amount) || 0), 0);

    // Insert summary data into MAG F4 Summary table
    const { data: summaryData, error: summaryError } = await supabase
      .from('MAG F4 Summary')
      .insert([
        {
          err_id,
          err_report_id,
          report_date: date || new Date().toISOString(),
          created_at: new Date().toISOString(),
          total_grant,
          total_other_sources,
          total_expenses,
          excess_expenses: additional_excess_expenses,
          surplus_use: additional_surplus_use,
          lessons: lessons_learned,
          training: additional_training_needs,
          files: files.length ? JSON.stringify(files) : null // Store file URLs as JSON array
        }
      ]);

    if (summaryError) {
      console.error('Error inserting summary:', summaryError.message);
      throw new Error("Failed to insert data into MAG F4 Summary");
    }

    // Insert each expense item into MAG F4 Expenses table
    for (const expense of expenses) {
      const { activity, description, payment_date, seller, payment_method, receipt_no, amount } = expense;

      // Skip incomplete entries
      if (!(activity && description && payment_date && seller && receipt_no && amount)) {
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
            expense_amount: parseFloat(amount) || 0
          }
        ]);

      if (expenseError) {
        console.error('Error inserting expense:', expenseError.message);
        throw new Error("Failed to insert expense data");
      }
    }

    res.status(200).json({ message: 'Form submitted successfully!' });
  } catch (error) {
    console.error('Error submitting form:', error);
    res.status(500).json({ message: error instanceof Error ? error.message : 'Error submitting form' });
  }
}
