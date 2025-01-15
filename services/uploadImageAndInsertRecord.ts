import { supabase } from "./supabaseClient";

/**
 * Upload to private bucket
 * 
 * TODO See if we can get project ID for everything
*/

export enum ImageCategory {
  FORM_CUSTOM,
  FORM_FILLED,
  FORM_SCANNED,
  REPORT_EXPENSES,
  EXPENSE_RECEIPT
}

export interface UploadResult {
  filename?: string;
  success: boolean;
  errorMessage?: string;
}

interface ErrorMessages {
  noFile?: string;
  uploadFailed?: string;
}

const BUCKET_NAME = "images";

export const uploadImageAndInsertRecord = async (
    file: File | null,
    category: ImageCategory,
    projectId: string,
    description: string,
    errorMessages?: ErrorMessages
): Promise<UploadResult> => {
    // Validate required projectId
    if (!projectId) {
        return {
            success: false,
            errorMessage: 'Project ID is required for uploading images'
        };
    }

    if (!file) {
        return {
            success: false,
            errorMessage: errorMessages?.noFile || 'No file selected'
        };
    }

    try {
        const filename = getNewFilename(file);
        const newPath = getPath(filename, category);

        // Upload file to Supabase storage
        const { error: uploadError } = await supabase
            .storage
            .from(BUCKET_NAME)
            .upload(newPath, file);

        if (uploadError) throw uploadError;

        // Insert record into images table
        const { error: insertError } = await supabase
            .from('images')
            .insert([{
                created_at: new Date().toISOString(),
                project_id: projectId,  // Now required and validated
                filename: filename,
                path: newPath,
                category: ImageCategory[category],
                notes: description
            }]);

        if (insertError) throw insertError;

        return {
            success: true,
            filename: filename
        };
    } catch (error) {
        console.error('Error uploading image:', error);
        return {
            success: false,
            errorMessage: errorMessages?.uploadFailed || 'Failed to upload image'
        };
    }
};

const getNewFilename = (file: File) => {
    const fileExt = file.name.split('.').pop();
    return `${crypto.randomUUID()}.${fileExt}`;
}

const getPath = (filename: string, category: ImageCategory) => {
    let base: string;
    switch(category) {
        case ImageCategory.FORM_CUSTOM:
            base = "forms/custom";
            break;
        case ImageCategory.FORM_FILLED:
            base = "forms/filled";
            break;
        case ImageCategory.FORM_SCANNED:
            base = "forms/scanned";
            break;
        case ImageCategory.REPORT_EXPENSES:
            base = "reports/expenses";
            break;
        case ImageCategory.EXPENSE_RECEIPT:
            base = "receipts";
            break;
        default: 
            throw new Error("To upload, we needed a valid image category.");
    }
    return `${base}/${filename}`;
}