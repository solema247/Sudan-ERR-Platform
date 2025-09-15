import { NextApiRequest, NextApiResponse } from 'next';
import { newSupabase } from '../../services/newSupabaseClient';

/**
 * Project status
 * 
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        // Get the session from the Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ success: false, message: 'No authorization header' });
        }

        // Get session
        const { data: { user }, error: sessionError } = await newSupabase.auth.getUser(authHeader.replace('Bearer ', ''));

        if (sessionError || !user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        // First get the user's err_id from the users table
        const { data: userData, error: userError } = await newSupabase
            .from('users')
            .select('err_id')
            .eq('id', user.id)
            .single();

        if (userError || !userData) {
            console.error('Error fetching user data:', userError);
            return res.status(500).json({ success: false, message: 'Failed to fetch user data' });
        }

        // Get user's projects using err_id with all fields
        const { data: projects, error: projectsError } = await newSupabase
            .from('err_projects')
            .select(`
                id,
                date,
                state,
                locality,
                status,
                project_objectives,
                intended_beneficiaries,
                estimated_beneficiaries,
                estimated_timeframe,
                additional_support,
                banking_details,
                submitted_at,
                program_officer_name,
                program_officer_phone,
                reporting_officer_name,
                reporting_officer_phone,
                finance_officer_name,
                finance_officer_phone,
                planned_activities,
                funding_cycle_id,
                version,
                last_modified
            `)
            .eq('err_id', userData.err_id)
            .eq('is_draft', false)
            .order('last_modified', { ascending: false });

        if (projectsError) {
            console.error('Error fetching projects:', projectsError);
            return res.status(500).json({ success: false, message: 'Failed to fetch projects' });
        }

        // Fetch all planned activities
        const { data: activities, error: activitiesError } = await newSupabase
            .from('planned_activities')
            .select('id, activity_name')
            .eq('language', req.query.language || 'en');

        if (activitiesError) {
            console.error('Error fetching activities:', activitiesError);
            return res.status(500).json({ success: false, message: 'Failed to fetch activities' });
        }

        // Create a map of activity IDs to names
        const activityMap = activities.reduce((map, activity) => {
            map[activity.id] = activity.activity_name;
            return map;
        }, {});

        // Process projects to include activity names
        const processedProjects = projects.map(project => {
            let planned_activities = [];
            
            if (project.planned_activities) {
                // Parse if string
                const activities = typeof project.planned_activities === 'string' 
                    ? JSON.parse(project.planned_activities)
                    : project.planned_activities;

                // Map activity IDs to names
                planned_activities = activities.map(activity => ({
                    ...activity,
                    activityName: activityMap[activity.selectedActivity] || activity.selectedActivity
                }));
            }

            return {
                ...project,
                planned_activities
            };
        });

        return res.status(200).json({
            success: true,
            projects: processedProjects
        });
    } catch (error) {
        console.error('Project status error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}
