import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import i18n from '../../lib/i18n'; // Import i18n for translations

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Ensure the request method is POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    const errorMessage = i18n.t('errors.method_not_allowed', { lng: req.headers['accept-language'] || 'en' });
    return res.status(405).json({ error: errorMessage });
  }

  try {
    const {
      err_id,
      date,
      financial_summary,
      additional_questions,
      expenses,
      unused_text,
      files = [],
    } = req.body;

    const err_report_id = `${err_id || 'UNKNOWN'}-${Date.now()}`;

    // Calculate total expenses
    const total_expenses = expenses.reduce((acc: number, exp: any) => acc + (parseFloat(exp.amount) || 0), 0);

    // Insert summary data into the Custom Forms Summary table
    const { error: summaryError } = await supabase.from('Custom_Form_Summary').insert([
      {
        err_id,
        err_report_id,
        report_date: date || new Date().toISOString(),
        created_at: new Date().toISOString(),
        total_expenses: financial_summary?.total_expenses || null,
        total_grant: financial_summary?.total_grant_received || null,
        total_other_sources: financial_summary?.total_other_sources || null,
        remainder: financial_summary?.remainder || null,
        excess_expenses: additional_questions?.excess_expenses || null,
        surplus_use: additional_questions?.surplus_use || null,
        lessons_learned: additional_questions?.lessons_learned || null,
        training_needs: additional_questions?.training_needs || null,
        unused_text: unused_text ? JSON.stringify(unused_text) : null,
        files: files.length ? JSON.stringify(files) : null,
      },
    ]);

    if (summaryError) {
      console.error('Error inserting summary:', summaryError.message);
      const errorMessage = i18n.t('errors.summary_insert_failed', { lng: req.headers['accept-language'] || 'en' });
      throw new Error(errorMessage);
    }

    // Insert expense items into Custom Form Expenses table
    for (const expense of expenses) {
      const { activity, description, payment_date, seller, payment_method, receipt_no, amount } = expense;

      if (!(activity && description && payment_date && seller && receipt_no && amount)) {
        console.warn('Skipping incomplete expense entry:', expense);
        continue;
      }

      const { error: expenseError } = await supabase.from('Custom_Form_Expenses').insert([
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
        console.error('Error inserting expense:', expenseError.message);
        const errorMessage = i18n.t('errors.expense_insert_failed', { lng: req.headers['accept-language'] || 'en' });
        throw new Error(errorMessage);
      }
    }

    const successMessage = i18n.t('messages.form_submission_success', { lng: req.headers['accept-language'] || 'en' });
    res.status(200).json({ message: successMessage });
  } catch (error: any) {
    console.error('Error submitting form:', error.message);
    const errorMessage = i18n.t('errors.internal_server_error', { lng: req.headers['accept-language'] || 'en' });
    res.status(500).json({ error: errorMessage });
  }
}
