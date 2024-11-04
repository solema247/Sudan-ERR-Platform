// pages/api/fill-form.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

function generateErrReportId(err_id: string): string {
    const prefix = err_id.slice(0, 3);
    const randomDigits = crypto.randomInt(10000, 99999);
    return `${prefix}${randomDigits}`;
}

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
                file
            } = req.body;

            const err_report_id = generateErrReportId(err_id || '');
            const total_expenses = expenses.reduce((acc: number, exp: any) => acc + (parseFloat(exp.amount) || 0), 0);

            const { data: summaryData, error: summaryError } = await supabase
                .from('MAG F4 Summary')
                .insert([{
                    err_id,
                    err_report_id,
                    created_at: date || new Date().toISOString(),
                    total_grant,
                    total_other_sources,
                    excess_expenses: additional_excess_expenses,
                    surplus_use: additional_surplus_use,
                    training: additional_training_needs,
                    lessons,
                    total_expenses
                }]);

            if (summaryError) throw new Error("Failed to insert data into MAG F4 Summary");

            for (const expense of expenses) {
                const {
                    activity, description, payment_date, seller, payment_method, receipt_no, amount
                } = expense;

                if (!(activity && description && payment_date && seller && receipt_no && amount)) {
                    continue; // Skip incomplete cards
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
                        expense_amount: parseFloat(amount) || 0
                    }]);

                if (expenseError) throw new Error("Failed to insert expense data");
            }

            if (file) {
                const uniqueFileName = `reports/${file.name}-${crypto.randomUUID()}`;
                const { data: uploadData, error: uploadError } = await supabase
                    .storage
                    .from('expense-reports')
                    .upload(uniqueFileName, Buffer.from(file.content, 'base64'), { contentType: file.type });

                if (uploadError) throw uploadError;

                const { publicUrl } = supabase
                    .storage
                    .from('expense-reports')
                    .getPublicUrl(uniqueFileName);

                await supabase
                    .from('MAG F4 Summary')
                    .update({ files: publicUrl })
                    .eq('err_report_id', err_report_id);
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
