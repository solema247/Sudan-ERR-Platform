import { newSupabase } from '../../../../services/newSupabaseClient';
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
            // Get current session
            const { data: { session } } = await newSupabase.auth.getSession();
            
            if (!session) {
                throw new Error(t('errorMessages.noSession'));
            }

            // First submit form to get report_id
            const response = await fetch('/api/program-report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
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

            // Only attempt to upload files if there are any
            if (uploadingFiles.length > 0) {
                try {
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

                    const fileUpdateResponse = await fetch('/api/program-report/files', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`
                        },
                        credentials: 'include',
                        body: JSON.stringify({
                            report_id,
                            files: uploadedFiles
                        }),
                    });

                    if (!fileUpdateResponse.ok) {
                        const errorData = await fileUpdateResponse.json();
                        throw new Error(errorData.message || t('errorMessages.fileUploadError'));
                    }
                } catch (fileError) {
                    console.error('File upload error:', fileError);
                    // Continue with form submission even if file upload fails
                    // but log the error for debugging
                }
            }

            return { success: true };
        } catch (error) {
            console.error('Submission error:', error);
            throw error;
        }
    }; 