// Components/FileUploader.tsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabaseClient";

interface FileUploaderProps {
  onUploadComplete: (urls: string[]) => void;
}

/**
  * UI for choosing files to upload.
  * 
  * TODO: Move non-UI controller stuff into api or elsewhere
  * 
  * @param param0 
  * @returns 
*/

const FileUploader: React.FC<FileUploaderProps> = ({ onUploadComplete }) => {
  const { t } = useTranslation("scanForm"); // Use scanForm namespace for translations
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(selectedFiles);
      setUploading(true);
      const urls: string[] = [];

      try {
        for (const file of selectedFiles) {
          // Create unique filename
          const fileExt = file.name.split('.').pop();
          const fileName = `scanned-reports/${Date.now()}-${self.crypto.randomUUID()}.${fileExt}`;

          // Upload directly to Supabase storage
          const { data: uploadData, error: uploadError } = await supabase
            .storage
            .from('expense-reports')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          // Get public URL
          const { data } = supabase
            .storage
            .from('expense-reports')
            .getPublicUrl(fileName);

          urls.push(data.publicUrl);
        }

        // Notify parent component of completion
        onUploadComplete(urls);
        setFiles([]);
      } catch (error) {
        console.error(t("errors.upload_failed"), error);
        alert(t("errors.upload_failed"));
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <div>
      {/* "Choose Files" button styled as a label */}
      <label className="bg-primaryGreen text-white py-2 px-4 rounded-lg shadow-md hover:bg-green-700 transition-all cursor-pointer inline-flex items-center justify-center">
        {uploading ? t("uploading") : t("choose_files")}
        <input
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
          disabled={uploading}
        />
      </label>
      {/* Display selected file names */}
      {files.length > 0 && !uploading && (
        <span className="text-gray-600 ml-2">
          {files.map((file) => file.name).join(", ")}
        </span>
      )}
    </div>
  );
};

export default FileUploader;


