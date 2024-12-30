import { supabase } from "./supabaseClient";
import { useTranslation } from 'react-i18next';

/**
 * Upload to private bucket
 * 
 * TODO: One-stop DRY function for all uploads to private bucket
 */

export enum ImageCategory {
  FORM_CUSTOM,
  FORM_FILLED,
  FORM_SCANNED,
  REPORT_EXPENSES
}

export interface UploadResult {
  filename?: string;
  success: boolean;
  errorMessage?: string;
}

const BUCKET_NAME = "images";

export async function uploadImageAndInsertRecord(file: File, category: ImageCategory, projectId: string, notes?: string): Promise<UploadResult> {
   const { t } = useTranslation('uploadImage');

  try {
    const filename = getNewFilename(file);
    const newPath = getPath(filename, category);

    // 1. Upload file directly to private Supabase storage bucket
    const { data: _, error: uploadError } = await supabase
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
          project_id: projectId,
          filename: filename,
          path: newPath,
          category: ImageCategory[category],
          notes: notes
          },  
      ]);

      if (insertError) {
        throw insertError;
      }

       // If no error, return success and the file name
      return {
        success: true,
        filename: filename
      }

    } catch (error) {
      console.error('Error uploading file:', error);
      alert(t('fileUploadError'));
      return;
      } 
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
    case ImageCategory.REPORT_EXPENSES:
      base = "reports/expenses";
      break;
    default: 
      throw new Error("To upload, we needed a valid image category.");
   }
  const path = `${base}/${filename}`;
  return path;
}