import { NextApiRequest, NextApiResponse } from 'next';
import { newSupabase } from '../../services/newSupabaseClient';
import { validateJWT } from '../../services/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const token = req.cookies.token;
    const user = validateJWT(token);
    if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (req.method === 'POST') {
        const { project_id, summary, activities } = req.body;
        let { draft_id } = req.body;
        
        try {
            if (draft_id) {
                // Update existing draft
                const { error: summaryError } = await newSupabase
                    .from('err_program_report')
                    .update({
                        ...summary,
                        project_id,
                        is_draft: true
                    })
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
                    .insert({
                        ...summary,
                        project_id,
                        is_draft: true
                    })
                    .select()
                    .single();

                if (reportError) throw reportError;
                draft_id = reportData.id;
            }

            // Insert new activities
            if (activities?.length > 0) {
                const activitiesWithDraft = activities.map(activity => ({
                    ...activity,
                    report_id: draft_id,
                    is_draft: true
                }));

                const { error: activitiesError } = await newSupabase
                    .from('err_program_reach')
                    .insert(activitiesWithDraft);

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

                return res.status(200).json({ draft });
            } catch (error) {
                console.error('Error fetching single draft:', error);
                return res.status(500).json({
                    error: 'Failed to fetch draft'
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

            return res.status(200).json({ drafts });
        } catch (error) {
            console.error('Error fetching drafts:', error);
            return res.status(500).json({
                error: 'Failed to fetch drafts'
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
                error: 'Failed to delete draft'
            });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
} 