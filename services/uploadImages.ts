import { newSupabase } from "./newSupabaseClient";

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
  projectId: string,
  expenseId: string
): Promise<{ url: string; success: boolean; error?: string }[]> {
    const results = [];

    for (const file of files) {
        try {
            const filename = `${Date.now()}_${file.name}`;
            const path = `receipts/${projectId}/${expenseId}/${filename}`;

            const { error: uploadError } = await newSupabase.storage
                .from('images')
                .upload(path, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = newSupabase.storage
                .from('images')
                .getPublicUrl(path);

            const { error: receiptError } = await newSupabase
                .from('receipts')
                .insert([{
                    expense_id: expenseId,
                    image_url: publicUrl,
                    created_at: new Date().toISOString(),
                }]);

            if (receiptError) throw receiptError;

            results.push({
                url: publicUrl,
                success: true
            });
        } catch (error) {
            results.push({
                success: false,
                error: error.message
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