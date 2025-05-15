export default interface Project {
    id: string;
    project_objectives: string;
    state: string;
    locality: string;
    is_draft?: boolean;
    last_modified?: string;
    created_by?: string;
    status?: string;
    version?: number;
    current_feedback_id?: string;
    feedback?: {
        id: string;
        feedback_text: string;
        feedback_status: 'pending_changes' | 'changes_submitted' | 'resolved';
        created_at: string;
        iteration_number: number;
        created_by: {
            full_name: string;
        };
    };
    // TODO: Anything else?
}
