import { supabase } from "../lib/supabaseClient";

/**
 * Upload to private bucket
 * 
 * TODO: One-stop DRY function for all uploads to private bucket
 */

// TODO: Do we need a File tho?

interface UploadResult {
  success: boolean;
  fileName?: string;       
  errorMessage?: string;
  bucketName?: string;
  // TODO: See if we need any other return info
}

export async function uploadToPrivateBucket(
  file: File | Blob,
  bucketName: string,
  filePath: string
): Promise<UploadResult> {
  try {
    let fileName = filePath;
    if ((file as File).name) {
      const originalName = (file as File).name;
      const extension = originalName.split('.').pop() ?? '';
      fileName = filePath.endsWith(extension)
        ? filePath
        : `${filePath}.${extension}`;
    }

    // Perform the upload using Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: '3600', // optional
        upsert: false,        // do not overwrite existing files
      });

    if (error) {
      return {
        success: false,
        errorMessage: error.message,
      };
    }

    // If no error, return success and the file name
    return {
      success: true,
      fileName,
    };
  } catch (err: any) {
    return {
      success: false,
      errorMessage: err.message || 'Unknown error occurred during upload',
    };
  }
}
