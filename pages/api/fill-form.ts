import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';
import crypto from 'crypto';

// Initialize Supabase client

// Function to generate unique ERR report ID
function generateErrReportId(err_id: string): string {
    const prefix = err_id.slice(0, 3);
    const randomDigits = crypto.randomInt(10000, 99999);
    return `${prefix}${randomDigits}`;
}

// Add this configuration object at the top of the file
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb' // Increase the size limit to 10MB
    }
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        debugger;
        try {
            const {
                err_id,
                date,
                total_grant = 0,
                total_other_sources = 0,
                additional_excess_expenses = '',
                additional_surplus_use = '',
                additional_training_needs = '',
                lessons = '',
                expenses = [],
                language
            } = req.body;

            if (!language) {
                throw new Error('Language field is missing in the request payload.');
            }

            // Generate a unique report ID
            const err_report_id = generateErrReportId(err_id || '');

            // Calculate the total expenses
            const total_expenses = expenses.reduce((acc: number, exp: any) => acc + (parseFloat(exp.amount) || 0), 0);

            // Insert data into MAG F4 Summary table with the file URL
            const { error: summaryError } = await supabase
                .from('MAG F4 Summary')
                .insert([{
                    err_id,
                    err_report_id,
                    report_date: date || new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    total_grant,
                    total_other_sources,
                    excess_expenses: additional_excess_expenses,
                    surplus_use: additional_surplus_use,
                    training: additional_training_needs,
                    lessons,
                    total_expenses,
                    language
                }]);

            if (summaryError) throw new Error('Failed to insert data into MAG F4 Summary');

            // Insert completed expense entries into MAG F4 Expenses table
            for (const expense of expenses) {
                const {
                    activity, description, payment_date, seller, payment_method, receipt_no, amount
                } = expense;

                // Skip incomplete cards
                if (!(activity && description && payment_date && seller && receipt_no && amount)) {
                    continue;
                }

                const { error: expenseError } = await supabase
                    .from('MAG F4 Expenses')
                    .insert([{
                        err_report_id,
                        expense_activity: activity,
                        expense_description: description,
                        payment_date,
                        seller,
                        payment_method,
                        receipt_no,
                        expense_amount: parseFloat(amount) || 0,
                        language
                    }]);

                if (expenseError) throw new Error('Failed to insert expense data');
            }

            res.status(200).json({ message: 'Form submitted successfully!' });
        } catch (error) {
            console.error('Error submitting form:', error);
            res.status(500).json({ message: error.message || 'Error submitting form' });
        }
    } else {
        res.status(405).json({ message: 'Method not allowed' });
    }
}
