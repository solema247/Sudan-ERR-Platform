import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../services/supabaseClient';
import crypto from 'crypto';

/**
 * Fill Form
 * 
 * When the user fills out form for M4 report
 */

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

            // Generate a unique report ID
            const err_report_id = generateErrReportId(err_id || '');

            // Calculate the total expenses
            const total_expenses = expenses.reduce((acc: number, exp: any) => acc + (parseFloat(exp.amount) || 0), 0);

            // Insert data into MAG F4 Summary table
            const { data: formRecord, error: summaryError } = await supabase
                .from('MAG F4 Summary')
                .insert([{
                    created_at: new Date().toISOString(),
                    err_id,
                    err_report_id,
                    report_date: date || new Date().toISOString(),
                    total_grant,
                    total_other_sources,
                    excess_expenses: additional_excess_expenses,
                    surplus_use: additional_surplus_use,
                    training: additional_training_needs,
                    lessons,
                    total_expenses,
                    language
                }])
                .select()
                .single();

            if (summaryError) throw new Error('Failed to insert data into MAG F4 Summary');

            // Insert completed expense entries
            for (const expense of expenses) {
                const {
                    activity, description, payment_date, seller, 
                    payment_method, receipt_no, amount, receipt_upload
                } = expense;

                // Skip incomplete cards
                if (!(activity && description && payment_date && seller && receipt_no && amount)) {
                    continue;
                }

                // Validate receipt upload
                if (!receipt_upload) {
                    return res.status(400).json({
                        success: false,
                        message: 'Receipt upload is required for each expense'
                    });
                }

                // Insert expense record with receipt reference
                try {
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
                            receipt_id: receipt_upload,
                            language
                        }]);

                    if (expenseError) {
                        console.error('Detailed expense error:', expenseError);
                        throw new Error(`Failed to insert expense data: ${expenseError.message}`);
                    }
                } catch (error) {
                    console.error('Full error object:', error);
                    throw error;
                }
            }

            res.status(200).json({ 
                success: true,
                message: 'Form submitted successfully!',
                report_id: err_report_id
            });
        } catch (error) {
            console.error('Error submitting form:', error);
            res.status(500).json({ 
                success: false,
                message: error.message || 'Error submitting form' 
            });
        }
    } else {
        res.status(405).json({ message: 'Method not allowed' });
    }
}
