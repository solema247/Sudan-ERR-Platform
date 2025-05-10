import { NextApiRequest, NextApiResponse } from 'next';
import { newSupabase } from '../../services/newSupabaseClient';
import { validateSession } from '../../services/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        // Get the session from the Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ success: false, message: 'No authorization header' });
        }

        // Validate session and get user data
        const user = await validateSession(authHeader.replace('Bearer ', ''));
        if (!user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        if (req.method === 'GET') {
            const { project_id, draft_id } = req.query;
            
            if (draft_id) {
                // Fetch specific draft with its expenses
                const { data: summaryData, error: summaryError } = await newSupabase
                    .from('err_summary')
                    .select('*')
                    .eq('id', draft_id)
                    .single();

                if (summaryError) throw summaryError;

                // Fetch associated expenses
                const { data: expenseData, error: expenseError } = await newSupabase
                    .from('err_expense')
                    .select('*')
                    .eq('project_id', project_id)
                    .eq('is_draft', true);

                if (expenseError) throw expenseError;

                // Map expense data back to form format
                const mappedExpenses = expenseData?.map(expense => ({
                    activity: expense.expense_activity,
                    description: expense.expense_description,
                    amount: expense.expense_amount,
                    payment_date: expense.payment_date,
                    payment_method: expense.payment_method,
                    receipt_no: expense.receipt_no,
                    seller: expense.seller
                }));

                return res.status(200).json({ 
                    success: true, 
                    draft: {
                        ...summaryData,
                        expenses: mappedExpenses
                    }
                });
            }

            // Fetch drafts for the project
            const { data, error } = await newSupabase
                .from('err_summary')
                .select('*')
                .eq('project_id', project_id)
                .eq('is_draft', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return res.status(200).json({ success: true, drafts: data });
        }

        if (req.method === 'POST') {
            const { summary, expenses, project_id, draft_id } = req.body;
            
            try {
                // If we have a draft_id, update existing draft
                if (draft_id) {
                    // Update summary without updated_at field
                    const { error: summaryError } = await newSupabase
                        .from('err_summary')
                        .update({
                            ...summary,
                            project_id,
                            is_draft: true
                        })
                        .eq('id', draft_id);

                    if (summaryError) throw summaryError;

                    // Delete old expenses
                    const { error: deleteError } = await newSupabase
                        .from('err_expense')
                        .delete()
                        .eq('project_id', project_id)
                        .eq('is_draft', true);

                    if (deleteError) throw deleteError;
                } else {
                    // Create new draft
                    const { data: summaryData, error: summaryError } = await newSupabase
                        .from('err_summary')
                        .insert({
                            ...summary,
                            project_id,
                            is_draft: true
                        })
                        .select()
                        .single();

                    if (summaryError) throw summaryError;
                }

                // Insert new expenses
                if (expenses?.length > 0) {
                    const expensesWithDraft = expenses.map(expense => ({
                        project_id,
                        expense_activity: expense.activity,
                        expense_description: expense.description,
                        expense_amount: expense.amount,
                        payment_date: expense.payment_date,
                        payment_method: expense.payment_method,
                        receipt_no: expense.receipt_no,
                        seller: expense.seller,
                        is_draft: true
                    }));

                    const { error: expensesError } = await newSupabase
                        .from('err_expense')
                        .insert(expensesWithDraft);

                    if (expensesError) throw expensesError;
                }

                return res.status(200).json({ 
                    success: true, 
                    message: 'Draft saved successfully'
                });
            } catch (error) {
                console.error('Error in draft save:', error);
                return res.status(500).json({
                    success: false,
                    message: error.message || 'Failed to save draft'
                });
            }
        }

        if (req.method === 'DELETE') {
            const { draft_id, project_id } = req.query;
            
            // Delete related expenses first
            const { error: expenseError } = await newSupabase
                .from('err_expense')
                .delete()
                .eq('project_id', project_id)
                .eq('is_draft', true);

            if (expenseError) throw expenseError;

            // Then delete the summary
            const { error: summaryError } = await newSupabase
                .from('err_summary')
                .delete()
                .eq('id', draft_id)
                .eq('is_draft', true);

            if (summaryError) throw summaryError;

            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ success: false, message: 'Method not allowed' });
    } catch (error) {
        console.error('Error in financial-report-drafts:', error);
        return res.status(500).json({ 
            success: false, 
            message: error.message || 'An unexpected error occurred' 
        });
    }
} 