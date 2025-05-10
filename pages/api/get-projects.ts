// /pages/api/get-projects.ts
import { NextApiRequest, NextApiResponse } from "next";
import { newSupabase } from "../../services/newSupabaseClient";
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
        if (!user) {
            return res
                .status(401)
                .json({ success: false, message: 'Unauthorized' });
        }

        const { includeDrafts } = req.query; // Optional query parameter

        const query = newSupabase
            .from("err_projects")
            .select("id, project_objectives, state, locality")
            .eq("created_by", user.err_id);  // Use created_by instead of err_id

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

        return res.status(200).json({ success: true, projects });
    } catch (error: any) {
        console.error("Unexpected error in get-projects:", error.message);
        return res
            .status(500)
            .json({ success: false, message: "Internal server error" });
    }
}
