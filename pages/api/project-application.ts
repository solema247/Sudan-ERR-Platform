// pages/api/project-application.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { newSupabase } from '../../services/newSupabaseClient';
import { validateSession } from '../../services/auth';

/**
 * F1 Project Application
 * 
 * Handles 
 * - Drop-down options for state and locality, provided via a GET request
 * - A POST of the F1 project application from front-end
 */

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
            try {
                const [plannedActivitiesResult, expenseCategoriesResult, statesResultRaw] = await Promise.all([
                    // Activities - only fetch English as translations are in JSON
                    newSupabase
                        .from('planned_activities')
                        .select('id, activity_name')
                        .eq('language', 'en'),
                    // Expenses - only fetch English as translations are in JSON
                    newSupabase
                        .from('expense_categories')
                        .select('id, expense_name')
                        .eq('language', 'en'),
                    // States - includes both English and Arabic in the table
                    newSupabase
                        .from('states')
                        .select('state_name, state_name_ar, locality, locality_ar')
                        .neq('state_name', null)
                        .order('state_name', { ascending: true })
                ]);

                // Error handling
                if (plannedActivitiesResult.error) {
                    throw new Error(`Planned Activities Error: ${plannedActivitiesResult.error.message}`);
                }
                if (expenseCategoriesResult.error) {
                    throw new Error(`Expense Categories Error: ${expenseCategoriesResult.error.message}`);
                }
                if (statesResultRaw.error) {
                    throw new Error(`States Error: ${statesResultRaw.error.message}`);
                }

                // Format activities to match what frontend expects
                const formattedActivities = plannedActivitiesResult.data.map(item => ({
                    id: item.id,
                    name: item.activity_name // Frontend will handle translation via i18n
                }));

                // Format expenses to match what frontend expects
                const formattedExpenses = expenseCategoriesResult.data.map(item => ({
                    id: item.id,
                    name: item.expense_name // Frontend will handle translation via i18n
                }));

                // Group localities by state
                const groupedStates = statesResultRaw.data.reduce((acc: any[], item: any) => {
                    const language = req.query.language as string;
                    const isArabic = language === 'ar';
                    
                    const stateName = isArabic ? item.state_name_ar : item.state_name;
                    const localityName = isArabic ? item.locality_ar : item.locality;
                    
                    const state = acc.find((s: any) => s.state_name === stateName);
                    if (state) {
                        state.localities.push(localityName);
                    } else {
                        acc.push({ state_name: stateName, localities: [localityName] });
                    }
                    return acc;
                }, []);

                return res.status(200).json({
                    success: true,
                    plannedActivities: formattedActivities,
                    expenseCategories: formattedExpenses,
                    states: groupedStates,
                });
            } catch (error) {
                console.error('Detailed error in GET request:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error fetching dropdown options',
                    error: error.message
                });
            }
        }

        if (req.method === 'POST') {
            const { 
                id,
                currentLanguage, 
                ...formData 
            } = req.body;

            try {
                const projectData = {
                    ...formData,
                    err_id: user.err_id, // Use err_id from validated session
                    language: currentLanguage || 'en',
                    status: 'pending',
                    is_draft: false,
                    last_modified: new Date().toISOString(),
                    submitted_at: new Date().toISOString(),
                    created_by: user.err_id
                };

                // First check if a draft exists for this user
                const { data: existingDraft } = await newSupabase
                    .from('err_projects')
                    .select('id')
                    .eq('created_by', user.err_id)
                    .eq('is_draft', true)
                    .single();

                let query;
                if (id || existingDraft?.id) {
                    // Update existing draft or project
                    const projectId = id || existingDraft?.id;
                    query = newSupabase
                        .from('err_projects')
                        .update(projectData)
                        .eq('id', projectId)
                        .eq('created_by', user.err_id)
                        .select()
                        .single();
                } else {
                    // Create new project
                    query = newSupabase
                        .from('err_projects')
                        .insert([projectData])
                        .select()
                        .single();
                }

                const { data, error } = await query;

                if (error) {
                    console.error('Error saving application:', error);
                    return res.status(500).json({
                        success: false,
                        message: 'Error saving application',
                        error: error.message,
                    });
                }

                console.log('Application submitted successfully:', data);
                return res.status(200).json({
                    success: true,
                    message: 'Application submitted successfully',
                    data,
                });
            } catch (error) {
                console.error('Server error during application submission:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Server error',
                    error: error.message,
                });
            }
        }

        // Step 4: Handle unsupported HTTP methods
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    } catch (error) {
        console.error('Unexpected server error:', error);
        return res.status(500).json({
            success: false,
            message: 'Unexpected server error',
            error: error.message,
        });
    }
}
