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
  REPORT_EXPENSES_FORM,
  REPORT_EXPENSES_RECEIPT,
  REPORT_EXPENSES_SUPPORTING_IMAGE
}

export interface UploadResult {
  filename?: string;
  success: boolean;
  errorMessage?: string;
}

const BUCKET_NAME = "images";

export async function uploadImages(
  files: File[], 
  category: ImageCategory, 
  projectId: string, 
  t: (key: string, options?: any) => string, 
  notes?: string
): Promise<UploadResult[]> {

  const results: UploadResult[] = [];

  for (const file of files) {
    try {
      const filename = getNewFilename(file);
      const newPath = getPath(filename, category);

      // 1. Upload file to the Supabase storage bucket
      const { error: uploadError } = await supabase
        .storage
        .from(BUCKET_NAME)
        .upload(newPath, file);

      if (uploadError) throw uploadError;

      // 2. Store a record of the file in Supabase's image table
      const { error: insertError } = await supabase
        .from('images')
        .insert([
          {
            created_at: new Date().toISOString(),
            project_id: projectId ?? "none",
            filename: filename,
            path: newPath,
            category: ImageCategory[category],
            notes: notes,
          },
        ]);

      if (insertError) throw insertError;

      // If no error, add success result to the array
      results.push({
        success: true,
        filename: filename,
      });
    } catch (error) {
      console.error('Error uploading file:', error);

      // Add failure result to the array
      results.push({
        success: false,
        errorMessage: t('fileUploadError'),
      });
    }
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