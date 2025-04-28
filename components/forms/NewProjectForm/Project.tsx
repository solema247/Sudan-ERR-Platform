export default interface Project {
    id: string;
    project_objectives: string;
    state: string;
    locality: string;
    is_draft?: boolean;
    last_modified?: string;
    created_by?: string;
    status?: string;
    // TODO: Anything else?
}
