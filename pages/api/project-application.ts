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

        if (req.method === 'POST' || req.method === 'PUT') {
            const { 
                id,
                currentLanguage, 
                ...formData 
            } = req.body;

            try {
                const projectData = {
                    ...formData,
                    err_id: user.err_id,
                    language: currentLanguage || 'en',
                    status: 'pending',
                    is_draft: false,
                    last_modified: new Date().toISOString(),
                    submitted_at: new Date().toISOString(),
                    created_by: user.err_id
                };

                let result;
                if (id) {
                    // Get current project version
                    const { data: currentProject, error: versionError } = await newSupabase
                        .from('err_projects')
                        .select('version, current_feedback_id')
                        .eq('id', id)
                        .single();

                    if (versionError) {
                        console.error('Error fetching project version:', versionError);
                        return res.status(500).json({
                            success: false,
                            message: 'Error fetching project version',
                            error: versionError.message
                        });
                    }

                    // Update version if this is a resubmission after feedback
                    if (currentProject.current_feedback_id) {
                        projectData.version = (currentProject.version || 1) + 1;
                        
                        // Update feedback status
                        const { error: feedbackError } = await newSupabase
                            .from('project_feedback')
                            .update({ feedback_status: 'changes_submitted' })
                            .eq('id', currentProject.current_feedback_id);

                        if (feedbackError) {
                            console.error('Error updating feedback status:', feedbackError);
                            return res.status(500).json({
                                success: false,
                                message: 'Error updating feedback status',
                                error: feedbackError.message
                            });
                        }
                    }

                    // Update existing project
                    const { data, error } = await newSupabase
                        .from('err_projects')
                        .update(projectData)
                        .eq('id', id)
                        .eq('created_by', user.err_id)
                        .select()
                        .single();

                    if (error) {
                        console.error('Error updating project:', error);
                        return res.status(500).json({
                            success: false,
                            message: 'Error updating project',
                            error: error.message
                        });
                    }
                    result = data;
                } else {
                    // Create new project
                    const { data, error } = await newSupabase
                        .from('err_projects')
                        .insert([{
                            ...projectData,
                            version: 1
                        }])
                        .select()
                        .single();

                    if (error) {
                        console.error('Error creating project:', error);
                        return res.status(500).json({
                            success: false,
                            message: 'Error creating project',
                            error: error.message
                        });
                    }
                    result = data;
                }

                return res.status(200).json({
                    success: true,
                    message: id ? 'Project updated successfully' : 'Project created successfully',
                    data: result
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
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
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
