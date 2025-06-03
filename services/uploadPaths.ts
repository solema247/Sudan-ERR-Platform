import { newSupabase } from "./newSupabaseClient";

interface PathOptions {
    errName: string;
    projectName: string;
    fileName: string;
    reportType: 'financial' | 'program';
    reportId?: string;
}

/**
 * Sanitizes a name for use in a file path by:
 * - Converting to lowercase
 * - Replacing spaces with hyphens
 * - Removing special characters
 * - Limiting length
 */
function sanitizeName(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50);
}

/**
 * Gets the current month folder name in YYYY-MM format
 */
function getCurrentMonthFolder(): string {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Constructs the upload path following the new convention:
 * images/projects/{err_name}/{project_name}/{report_type}/{YYYY-MM}/{filename}
 */
export async function constructUploadPath({
    errName,
    projectName,
    fileName,
    reportType,
    reportId
}: PathOptions): Promise<string> {
    const sanitizedErrName = sanitizeName(errName);
    const sanitizedProjectName = sanitizeName(projectName);
    const monthFolder = getCurrentMonthFolder();
    const timestamp = Date.now();
    const finalFileName = `${timestamp}-${fileName}`;

    const basePath = `projects/${sanitizedErrName}/${sanitizedProjectName}/${reportType}/${monthFolder}`;
    return reportId ? `${basePath}/${reportId}/${finalFileName}` : `${basePath}/${finalFileName}`;
}

/**
 * Helper function to get ERR name from the users table
 */
export async function getErrName(): Promise<string> {
    try {
        const { data: { session } } = await newSupabase.auth.getSession();
        if (!session) {
            throw new Error('No active session');
        }

        const { data: userData, error: userError } = await newSupabase
            .from('users')
            .select('err_id')
            .eq('id', session.user.id)
            .single();

        if (userError || !userData) {
            throw new Error('Failed to get ERR ID');
        }

        const { data: errData, error: errError } = await newSupabase
            .from('emergency_rooms')
            .select('name')
            .eq('id', userData.err_id)
            .single();

        if (errError || !errData) {
            throw new Error('Failed to get ERR name');
        }

        return sanitizeName(errData.name);
    } catch (error) {
        console.error('Error getting ERR name:', error);
        throw error;
    }
}

/**
 * Helper function to get project name from the projects table
 */
export async function getProjectName(projectId: string): Promise<string> {
    try {
        const { data: project, error } = await newSupabase
            .from('err_projects')
            .select('project_objectives')
            .eq('id', projectId)
            .single();

        if (error || !project) {
            throw new Error('Failed to get project name');
        }

        return sanitizeName(project.project_objectives);
    } catch (error) {
        console.error('Error getting project name:', error);
        throw error;
    }
} 