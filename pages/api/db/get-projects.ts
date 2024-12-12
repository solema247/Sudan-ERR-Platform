// /pages/api/get-projects.ts
import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../../lib/supabaseClient";
import { validateJWT } from "../../../lib/auth";

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
        // Extract the token from the cookies
        const token = req.cookies.token;

        // Validate the token
        const user = validateJWT(token);
        if (!user) {
            return res
                .status(401)
                .json({ success: false, message: "Unauthorized" });
        }

        // Extract user's ERR ID from the validated token
        const { err_id } = user;

        // Query Supabase for active projects for this ERR ID
        const { data: projects, error } = await supabase
            .from("err_projects")
            .select("id, project_objectives, state, locality")
            .eq("err", err_id)
            .eq("status", "active");

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
