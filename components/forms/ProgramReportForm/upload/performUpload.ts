// File upload handling for program report
import { newSupabase } from '../../../../services/newSupabaseClient';
import { FileWithProgress, FileUploadResponse } from './UploadInterfaces';

export default async function uploadFile(
    file: FileWithProgress,
    projectId: string,
    reportId: string,
    onProgress: (progress: number) => void
): Promise<FileUploadResponse> {
    const fileName = `${Date.now()}-${file.file.name}`;
    const filePath = `projects/${projectId}/program-reports/${reportId}/${fileName}`;

    const { data, error } = await newSupabase.storage
        .from('images')
        .upload(filePath, file.file, {
            onUploadProgress: (progress) => {
                const percentage = (progress.loaded / progress.total) * 100;
                onProgress(percentage);
            },
            cacheControl: '3600',
            upsert: false
        });

    if (error) throw error;

    const { data: urlData } = newSupabase.storage
        .from('images')
        .getPublicUrl(filePath);

    return {
        id: data.path,
        file_name: file.file.name,
        file_url: urlData.publicUrl,
        file_type: file.file.type,
        file_size: file.file.size
    };
} 