// TypeScript interfaces for upload functionality
export interface FileWithProgress {
  file: File;
  progress: number;
}

export interface UploadedFile {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
}

export interface FileUploadResponse {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
} 