// File upload handling for program report
import { newSupabase } from '../../../../services/newSupabaseClient';
import { FileWithProgress, FileUploadResponse } from './UploadInterfaces';
import { constructUploadPath, getErrName, getProjectName } from '../../../../services/uploadPaths';

export default async function uploadFile(
    file: FileWithProgress,
    projectId: string,
    onProgress: (progress: number) => void
): Promise<FileUploadResponse> {
    try {
        // Get ERR name and project name
        const errName = await getErrName();
        const projectName = await getProjectName(projectId);

        // Construct the new path
        const path = await constructUploadPath({
            errName,
            projectName,
            fileName: file.file.name,
            reportType: 'program'
        });

        const { data, error } = await newSupabase.storage
            .from('images')
            .upload(path, file.file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;

        const { data: urlData } = newSupabase.storage
            .from('images')
            .getPublicUrl(path);

        // Add progress tracking separately using XMLHttpRequest
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
                const percentage = (event.loaded / event.total) * 100;
                onProgress(percentage);
            }
        });

        return {
            id: data.path,
            file_name: file.file.name,
            file_url: urlData.publicUrl,
            file_type: file.file.type,
            file_size: file.file.size
        };
    } catch (error) {
        console.error('Upload failed:', error);
        throw error;
    }
} 