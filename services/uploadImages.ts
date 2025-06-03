import { newSupabase } from "./newSupabaseClient";
import { constructUploadPath, getErrName, getProjectName } from "./uploadPaths";

/**
 * Upload to private bucket
 * 
 * TODO See if we can get project ID for everything
*/

export enum ImageCategory {
  FORM_CUSTOM,
  FORM_FILLED,
  FORM_SCANNED,
  REPORT_EXPENSES_FORM,
  REPORT_EXPENSES_RECEIPT,
  REPORT_EXPENSES_SUPPORTING_IMAGE
}

export interface UploadResult {
  filename?: string;
  success: boolean;
  errorMessage?: string;
  url?: string;
}

const BUCKET_NAME = "images";

export const uploadImages = async (
    files: File[],
    projectId: string,
    reportType: 'financial' | 'program'
) => {
    const results: UploadResult[] = [];

    try {
        // Get ERR name and project name once for all files
        const errName = await getErrName();
        const projectName = await getProjectName(projectId);

        for (const file of files) {
            try {
                // Construct the new path
                const path = await constructUploadPath({
                    errName,
                    projectName,
                    fileName: file.name,
                    reportType
                });

                // Upload the file
                const { data, error } = await newSupabase.storage
                    .from(BUCKET_NAME)
                    .upload(path, file, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (error) throw error;

                // Get public URL
                const { data: { publicUrl } } = newSupabase.storage
                    .from(BUCKET_NAME)
                    .getPublicUrl(path);

                results.push({
                    filename: file.name,
                    success: true,
                    url: publicUrl
                });
            } catch (error) {
                console.error('Upload error:', error);
                results.push({
                    filename: file.name,
                    success: false,
                    errorMessage: error.message
                });
            }
        }
    } catch (error) {
        console.error('Error getting project/ERR info:', error);
        return files.map(file => ({
            filename: file.name,
            success: false,
            errorMessage: 'Failed to get project information'
        }));
    }

    return results;
}


const getNewFilename = (file: File) => {
    const fileExt = file.name.split('.').pop();
    return`${crypto.randomUUID()}.${fileExt}`;
}

const getPath = (filename: String, category: ImageCategory) => {
  let base:string;
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
    case ImageCategory.REPORT_EXPENSES_FORM:
      base = "reports/expenses";
      break;
    case ImageCategory.REPORT_EXPENSES_SUPPORTING_IMAGE:
      base = "reports/expenses";
      break;
    case ImageCategory.REPORT_EXPENSES_RECEIPT:
      base = "reports/expenses";
    default: 
      throw new Error("To upload, we needed a valid image category.");
   }
  const path = `${base}/${filename}`;
  return path;
}