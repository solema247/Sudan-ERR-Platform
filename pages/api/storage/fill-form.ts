import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/**
 * Fill form
 * 
 * User has filled forms and will now upload relevant files and receipts.
 * This is stored in the table 'Reports.'
 * 
 */

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET_NAME_IMAGES;
const FOLDER_PATH = "forms/filled";

// Function to generate unique ERR report ID
function generateErrReportId(err_id: string): string {
    const prefix = err_id.slice(0, 3);
    const randomDigits = crypto.randomInt(10000, 99999);
    return `${prefix}${randomDigits}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

    // 1. Post to the database

    if (req.method === 'POST') {
        try {
            // Destructure the incoming request body
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
                file,
                language // Dynamically added language field
            } = req.body;

            if (!language) {
                throw new Error('Language field is missing in the request payload.');
            }

            // Generate a unique report ID
            const err_report_id = generateErrReportId(err_id || '');

            // Calculate the total expenses from completed cards
            const total_expenses = expenses.reduce((acc: number, exp: any) => acc + (parseFloat(exp.amount) || 0), 0);

            // Insert data into MAG F4 Summary table
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
                    language // Add language field
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
                        language // Add language field for each expense
                    }]);

                if (expenseError) throw new Error('Failed to insert expense data');
            }

            // 2. Handle file upload if file exists
            if (file) {
                const uniqueFileName = `${FOLDER_PATH}/${file.name}-${crypto.randomUUID()}`;
                const { error: uploadError } = await supabase
                    .storage
                    .from(BUCKET_NAME)
                    .upload(uniqueFileName, Buffer.from(file.content, 'base64'), { contentType: file.type });

                if (uploadError) throw uploadError;

                // TODO: Stick record in new Files table.
                
                // // Retrieve the signed URL of the uploaded file
                // const { data } = supabase
                //     .storage
                //     .from(BUCKET_NAME)
                //     .createSignedUrl
                //     .getPublicUrl(uniqueFileName);

                // const publicUrl = data.publicUrl; 

                // // Update files column in MAG F4 Summary table
                // await supabase
                //     .from('MAG F4 Summary')
                //     .update({ files: publicUrl })
                //     .eq('err_report_id', err_report_id);
            }

            // Respond with success message
            res.status(200).json({ message: 'Form submitted successfully!' });
        } catch (error) {
            console.error('Error submitting form:', error);
            res.status(500).json({ message: error.message || 'Error submitting form' });
        }
    } else {
        res.status(405).json({ message: 'Method not allowed' });
    }
}
