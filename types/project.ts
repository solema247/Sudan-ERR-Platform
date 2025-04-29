export interface Project {
    id: string | number;
    project_name: string;
    project_objectives: string;
    planned_activities?: Array<{
        selectedOption?: string;
        placeOfOperation?: string;
    }>;
    err?: string;
    beneficiaries?: string;
    objectives?: string;
} 