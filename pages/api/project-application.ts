// pages/api/project-application.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../services/supabaseClient';
import { validateJWT } from '../../services/auth';

/**
 * F1 Project Application
 * 
 * Handles 
 * - Drop-down options for state and locality, provided via a GET request
 * - A POST of the F1 project application from front-end
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const token = req.cookies.token;
        const user = validateJWT(token);

        if (!user) {
            console.error('Unauthorized: Invalid JWT');
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        if (req.method === 'GET') {
            try {
                const [plannedActivitiesResult, expenseCategoriesResult, statesResultRaw] = await Promise.all([
                    supabase.from('planned_activities').select('id, name'),
                    supabase.from('expense_categories').select('id, name'),
                    supabase
                        .from('states')
                        .select('state_name, state_name_ar, locality, locality_ar')
                        .neq('state_name', null)
                        .order('state_name', { ascending: true }),
                ]);

                // Log the results to check for errors
                console.log('Supabase Results:', {
                    plannedActivities: plannedActivitiesResult,
                    expenseCategories: expenseCategoriesResult,
                    states: statesResultRaw
                });

                if (plannedActivitiesResult.error) {
                    throw new Error(`Planned Activities Error: ${plannedActivitiesResult.error.message}`);
                }
                if (expenseCategoriesResult.error) {
                    throw new Error(`Expense Categories Error: ${expenseCategoriesResult.error.message}`);
                }
                if (statesResultRaw.error) {
                    throw new Error(`States Error: ${statesResultRaw.error.message}`);
                }

                // Group localities by state_name, using Arabic names if language is Arabic
                const groupedStates = statesResultRaw.data.reduce((acc: any[], item: any) => {
                    const stateName = item.state_name_ar ? item.state_name_ar : item.state_name;
                    const localityName = item.locality_ar ? item.locality_ar : item.locality;
                    
                    const state = acc.find((s: any) => s.state_name === stateName);
                    if (state) {
                        state.localities.push(localityName);
                    } else {
                        acc.push({ state_name: stateName, localities: [localityName] });
                    }
                    return acc;
                }, []);

                // Send the dropdown options in the response
                return res.status(200).json({
                    success: true,
                    plannedActivities: plannedActivitiesResult.data || [],
                    expenseCategories: expenseCategoriesResult.data || [],
                    states: groupedStates,
                });
            } catch (error) {
                console.error('Detailed error in GET request:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error fetching dropdown options',
                    error: error.message,
                    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
                });
            }
        }

        if (req.method === 'POST') {
            const {
                date,
                state,
                locality,
                err,
                project_objectives,
                intended_beneficiaries,
                estimated_beneficiaries,
                planned_activities,
                expenses,
                estimated_timeframe,
                additional_support,
                officer_name,
                phone_number,
                banking_details
            } = req.body;

            console.log('Received POST data:', {
                date,
                state,
                locality,
                err,
                project_objectives,
                intended_beneficiaries,
                estimated_beneficiaries,
                planned_activities,
                expenses,
                estimated_timeframe,
                additional_support,
                officer_name,
                phone_number,
                banking_details
            });

            // Validate planned_activities and expenses fields
            const validatedPlannedActivities = Array.isArray(planned_activities) ? planned_activities : [];
            const validatedExpenses = Array.isArray(expenses) ? expenses : [];

            try {
                // Insert project application into Supabase
                const { data, error } = await supabase.from('err_projects').insert([
                    {
                        date,
                        state,
                        locality,
                        err,
                        project_objectives,
                        intended_beneficiaries,
                        estimated_beneficiaries,
                        planned_activities: validatedPlannedActivities,
                        expenses: validatedExpenses,
                        estimated_timeframe,
                        additional_support,
                        officer_name,
                        phone_number,
                        banking_details,        
                        language: 'en', // Default language is English
                    },
                ]);

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
