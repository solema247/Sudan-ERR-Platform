// /pages/api/get-projects.ts
import { NextApiRequest, NextApiResponse } from "next";
import { createAuthenticatedClient } from '../../services/createAuthenticatedClient';
import { getAccessScope, getRoomNames } from '../../services/accessScope';
import { validateSession } from "../../services/auth";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method !== "GET") {
        res.setHeader("Allow", ["GET"]);
        return res
            .status(405)
            .json({ success: false, message: "Method not allowed" });
    }

    try {
        // Get the session from the Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res
                .status(401)
                .json({ success: false, message: 'No authorization header' });
        }

        // Validate session and get user data
        const user = await validateSession(authHeader.replace('Bearer ', ''));
        // Query as the signed-in user so the database access rules (roles, rooms, states) apply
        const db = createAuthenticatedClient(authHeader.replace('Bearer ', ''));
        if (!user) {
            return res
                .status(401)
                .json({ success: false, message: 'Unauthorized' });
        }

        const { includeDrafts } = req.query; // Optional query parameter

        // Every project this user may see: own room (base), whole state (state ERR),
        // visible states (admin/support), everything (superadmin)
        const scope = await getAccessScope(db, user.id);
        if (!scope.all && scope.roomIds.length === 0) {
            return res.status(200).json({ success: true, projects: [] });
        }

        const query = db
            .from("err_projects")
            .select("id, project_objectives, state, locality, err_id")
            .eq("is_draft", false)
            .eq("status", "active");
        if (!scope.all) query.in("err_id", scope.roomIds);

        // Only include non-draft projects unless specifically requested
        if (!includeDrafts) {
            query.eq("is_draft", false);
        }

        // Only get active projects
        query.eq("status", "active");

        const { data: projects, error } = await query;

        if (error) {
            console.error("Error fetching projects:", error.message);
            return res
                .status(500)
                .json({ success: false, message: "Failed to fetch projects" });
        }

        // Say which room each project belongs to (shown when it isn't the user's own room)
        const rooms = await getRoomNames(db, (projects || []).map((p: any) => String(p.err_id || '')));
        const withRooms = (projects || []).map((p: any) => ({
            ...p,
            is_own_room: String(p.err_id) === scope.ownRoomId,
            room: rooms[String(p.err_id)] || null,
        }));

        return res.status(200).json({ success: true, projects: withRooms });
    } catch (error: any) {
        console.error("Unexpected error in get-projects:", error.message);
        return res
            .status(500)
            .json({ success: false, message: "Internal server error" });
    }
}
