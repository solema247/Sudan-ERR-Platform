// pages/api/project-application.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabaseClient';
import { validateJWT } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        // Step 1: Validate the user's session using the JWT token
        const token = req.cookies.token;
        const user = validateJWT(token);

        if (!user) {
            console.error('Unauthorized: Invalid JWT');
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        // Step 2: Handle GET request for fetching dropdown options
        if (req.method === 'GET') {
            try {
                // Force language to 'en' as Supabase tables contain only English values
                const language = 'en';

                // Fetch planned activities, expense categories, and states
                const [plannedActivitiesResult, expenseCategoriesResult, statesResultRaw] = await Promise.all([
                    supabase.from('planned_activities').select('id, name').eq('language', language),
                    supabase.from('expense_categories').select('id, name').eq('language', language),
                    supabase.from('states').select('state_name, locality').neq('state_name', null).order('state_name', { ascending: true }),
                ]);

                console.log('Fetched dropdown options:', {
                    plannedActivities: plannedActivitiesResult.data,
                    expenseCategories: expenseCategoriesResult.data,
                    states: statesResultRaw.data,
                });

                // Group localities by state_name
                const groupedStates = statesResultRaw.data.reduce((acc: any[], item: any) => {
                    const state = acc.find((s: any) => s.state_name === item.state_name);
                    if (state) {
                        state.localities.push(item.locality);
                    } else {
                        acc.push({ state_name: item.state_name, localities: [item.locality] });
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
                console.error('Error fetching dropdown options:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error fetching dropdown options',
                    error: error.message,
                });
            }
        }

        // Step 3: Handle POST request for submitting project applications
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
