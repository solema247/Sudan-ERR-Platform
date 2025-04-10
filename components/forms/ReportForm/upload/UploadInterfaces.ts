export interface FileWithProgress {
    id: string;
    file: File;
    uploaded: boolean;
    progress: number;
    uploadedUrl?: string;
    error?: any;
} 