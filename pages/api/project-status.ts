import { NextApiRequest, NextApiResponse } from 'next';
import { newSupabase } from '../../services/newSupabaseClient';
import { createAuthenticatedClient } from '../../services/createAuthenticatedClient';
import { validateSession } from '../../services/auth';
import { getAccessScope, getRoomNames } from '../../services/accessScope';

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

        const accessToken = authHeader.replace('Bearer ', '');

        // Only active ERR, support and admin accounts (partners and pending accounts are refused)
        const user = await validateSession(accessToken);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        // Create an authenticated client for database queries
        const authenticatedClient = createAuthenticatedClient(accessToken);

        // Which rooms this user may see: own room (base), whole state (state ERR),
        // visible states (admin/support), everything (superadmin)
        let scope;
        try {
            scope = await getAccessScope(authenticatedClient, user.id);
        } catch (e) {
            console.error('Error fetching user data:', e);
            return res.status(500).json({ success: false, message: 'Failed to fetch user data' });
        }
        if (!scope.all && scope.roomIds.length === 0) {
            return res.status(200).json({ success: true, projects: [] });
        }

        // Projects this user may see, newest first
        let projectsQuery = authenticatedClient
            .from('err_projects')
            .select(`
                id,
                date,
                state,
                locality,
                status,
                funding_status,
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
                last_modified,
                err_id
            `)
            .eq('is_draft', false)
            .order('last_modified', { ascending: false });
        if (!scope.all) projectsQuery = projectsQuery.in('err_id', scope.roomIds);
        const { data: projects, error: projectsError } = await projectsQuery;

        if (projectsError) {
            console.error('Error fetching projects:', projectsError);
            return res.status(500).json({ success: false, message: 'Failed to fetch projects' });
        }

        // Fetch all planned activities
        const { data: activities, error: activitiesError } = await authenticatedClient
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

        // Room names, shown on projects that aren't the user's own room
        const rooms = await getRoomNames(authenticatedClient, (projects || []).map((p: any) => String(p.err_id || '')));

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
                planned_activities,
                is_own_room: String(project.err_id) === scope.ownRoomId,
                room: rooms[String(project.err_id)] || null
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
