import { FileWithProgress, UploadedFile } from './UploadInterfaces';
import uploadFile from './performUpload';

interface FormValues {
    project_id: string;
    report_date: string;
    positive_changes: string;
    negative_results: string;
    unexpected_results: string;
    lessons_learned: string;
    suggestions: string;
    reporting_person: string;
    activities: Array<{
        activity_name: string;
        activity_goal: string;
        location: string;
        start_date: string;
        end_date: string;
        individual_count: number;
        household_count: number;
        male_count: number;
        female_count: number;
        under18_male: number;
        under18_female: number;
    }>;
    uploadedFiles: UploadedFile[];
}

export const createOnSubmit = (t: (key: string) => string) => 
    async (
        values: FormValues,
        projectId: string,
        uploadingFiles: FileWithProgress[],
        setUploadProgress: (index: number, progress: number) => void
    ) => {
        try {
            // First submit form to get report_id
            const response = await fetch('/api/program-report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    ...values,
                    project_id: projectId
                }),
            });

            if (!response.ok) {
                throw new Error(t('errorMessages.submitError'));
            }

            const { report_id } = await response.json();

            // Then upload all files with the correct path structure
            const uploadedFiles = await Promise.all(
                uploadingFiles.map((file, index) =>
                    uploadFile(
                        file,
                        projectId,
                        report_id,
                        (progress) => setUploadProgress(index, progress)
                    )
                )
            );

            // Finally, update the report with file metadata
            if (uploadedFiles.length > 0) {
                const fileUpdateResponse = await fetch('/api/program-report/files', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        report_id,
                        files: uploadedFiles
                    }),
                });

                if (!fileUpdateResponse.ok) {
                    throw new Error(t('errorMessages.fileUploadError'));
                }
            }

            return { success: true };
        } catch (error) {
            console.error('Submission error:', error);
            throw error;
        }
    }; 