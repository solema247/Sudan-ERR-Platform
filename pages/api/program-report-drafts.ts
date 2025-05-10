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

        if (req.method === 'POST') {
            const { project_id, summary, activities } = req.body;
            let { draft_id } = req.body;
            
            try {
                // Ensure required fields have at least empty string values
                const sanitizedSummary = {
                    report_date: summary.report_date || null, // Allow null for date fields
                    positive_changes: summary.positive_changes || '',
                    negative_results: summary.negative_results || '',
                    unexpected_results: summary.unexpected_results || '',
                    lessons_learned: summary.lessons_learned || '',
                    suggestions: summary.suggestions || '',
                    reporting_person: summary.reporting_person || '',
                    is_draft: true,
                    project_id
                };

                if (draft_id) {
                    // Update existing draft
                    const { error: summaryError } = await newSupabase
                        .from('err_program_report')
                        .update(sanitizedSummary)
                        .eq('id', draft_id);

                    if (summaryError) throw summaryError;

                    // Delete old activities
                    const { error: deleteError } = await newSupabase
                        .from('err_program_reach')
                        .delete()
                        .eq('report_id', draft_id)
                        .eq('is_draft', true);

                    if (deleteError) throw deleteError;
                } else {
                    // Create new draft
                    const { data: reportData, error: reportError } = await newSupabase
                        .from('err_program_report')
                        .insert(sanitizedSummary)
                        .select()
                        .single();

                    if (reportError) throw reportError;
                    draft_id = reportData.id;
                }

                // Insert new activities if they exist
                if (activities?.length > 0) {
                    const sanitizedActivities = activities.map(activity => ({
                        report_id: draft_id,
                        activity_name: activity.activity_name || '',
                        activity_goal: activity.activity_goal || '',
                        location: activity.location || '',
                        start_date: activity.start_date || null,
                        end_date: activity.end_date || null,
                        individual_count: activity.individual_count || 0,
                        household_count: activity.household_count || 0,
                        male_count: activity.male_count || 0,
                        female_count: activity.female_count || 0,
                        under18_male: activity.under18_male || 0,
                        under18_female: activity.under18_female || 0,
                        is_draft: true
                    }));

                    const { error: activitiesError } = await newSupabase
                        .from('err_program_reach')
                        .insert(sanitizedActivities);

                    if (activitiesError) throw activitiesError;
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

        if (req.method === 'GET') {
            // If draft_id is provided, fetch single draft
            if (req.query.draft_id) {
                try {
                    const { draft_id, project_id } = req.query;
                    const { data: draft, error } = await newSupabase
                        .from('err_program_report')
                        .select(`
                            *,
                            err_program_reach (*)
                        `)
                        .eq('id', draft_id)
                        .eq('project_id', project_id)
                        .eq('is_draft', true)
                        .single();

                    if (error) throw error;
                    if (!draft) throw new Error('Draft not found');

                    return res.status(200).json({ success: true, draft });
                } catch (error) {
                    console.error('Error fetching single draft:', error);
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to fetch draft'
                    });
                }
            }
            
            // Otherwise, fetch all drafts for a project
            try {
                const { project_id } = req.query;
                const { data: drafts, error } = await newSupabase
                    .from('err_program_report')
                    .select(`
                        id,
                        project_id,
                        created_at,
                        report_date,
                        positive_changes,
                        negative_results,
                        unexpected_results,
                        lessons_learned,
                        suggestions,
                        reporting_person,
                        err_program_reach (*)
                    `)
                    .eq('project_id', project_id)
                    .eq('is_draft', true)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                return res.status(200).json({ success: true, drafts });
            } catch (error) {
                console.error('Error fetching drafts:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch drafts'
                });
            }
        }

        if (req.method === 'DELETE') {
            const { draft_id } = req.query;
            try {
                const { error } = await newSupabase
                    .from('err_program_report')
                    .delete()
                    .eq('id', draft_id)
                    .eq('is_draft', true);

                if (error) throw error;

                return res.status(200).json({
                    success: true,
                    message: 'Draft deleted successfully'
                });
            } catch (error) {
                console.error('Error deleting draft:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to delete draft'
                });
            }
        }

        return res.status(405).json({ success: false, message: 'Method not allowed' });
    } catch (error) {
        console.error('Error in program-report-drafts:', error);
        return res.status(500).json({ 
            success: false, 
            message: error.message || 'An unexpected error occurred' 
        });
    }
} 