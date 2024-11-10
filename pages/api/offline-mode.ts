// pages/api/offline-mode.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { formData, expenses } = req.body;

    if (!formData || !formData.err_id || !formData.date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const err_report_id = `${formData.err_id}-${crypto.randomUUID()}`;

    // Insert summary data into the Supabase table
    const { error: summaryError } = await supabase
      .from('MAG F4 Summary')
      .insert([
        {
          err_id: formData.err_id,
          err_report_id,
          report_date: formData.date,
          total_grant: formData.total_grant,
          total_other_sources: formData.total_other_sources,
          total_expenses: formData.total_expenses,
          excess_expenses: formData.additional_excess_expenses,
          surplus_use: formData.additional_surplus_use,
          training: formData.additional_training_needs,
          lessons: formData.lessons,
          created_at: new Date().toISOString(),
        },
      ]);

    if (summaryError) {
      console.error('Error inserting summary data:', summaryError.message);
      throw new Error('Failed to insert summary data');
    }

    // Insert each expense entry
    for (const expense of expenses) {
      if (
        !expense.activity ||
        !expense.description ||
        !expense.payment_date ||
        !expense.seller ||
        !expense.receipt_no ||
        !expense.amount
      ) {
        continue;
      }

      const { error: expenseError } = await supabase
        .from('MAG F4 Expenses')
        .insert([
          {
            err_report_id,
            expense_activity: expense.activity,
            expense_description: expense.description,
            payment_date: expense.payment_date,
            seller: expense.seller,
            payment_method: expense.payment_method,
            receipt_no: expense.receipt_no,
            expense_amount: parseFloat(expense.amount),
          },
        ]);

      if (expenseError) {
        console.error('Error inserting expense data:', expenseError.message);
        throw new Error('Failed to insert expense data');
      }
    }

    res.status(200).json({ message: 'Form submitted successfully!' });
  } catch (error) {
    console.error('Error processing submission:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
