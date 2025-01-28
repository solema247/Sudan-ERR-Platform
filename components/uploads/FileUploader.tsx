// Components/FileUploader.tsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { uploadImages, ImageCategory } from "../../services/uploadImages";

interface FileUploaderProps {
  projectId: string;
  onUploadComplete: (urls: string[]) => void;
}

/**
  * UI for choosing files to upload for expense reports (TODO: For Scan Form only, right?)
  * 
  * TODO: Move non-UI controller stuff into api or elsewhere
  * TODO: See if we need the URL anywhere else besides what we are doing here.
  * TODO: Figure out what we are doing with upload results viz. array vs. singular
  * 
  * @param param0 
  * @returns 
*/

const FileUploader: React.FC<FileUploaderProps> = ({ projectId, onUploadComplete }) => {
  const { t } = useTranslation("scanForm"); // Use scanForm namespace for translations
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!projectId) {
      console.error('Project ID is required for uploading files');
      alert(t("errors.missing_project_id"));
      return;
    }

    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(selectedFiles);
      setUploading(true);
      const urls: string[] = [];

      try {
        for (const file of selectedFiles) {
          let result = await uploadImages(
            files, 
            ImageCategory.FORM_SCANNED, 
            projectId,
            t,
            "Scanned report",
          );
          if (result[0].errorMessage) { 
            throw new Error(result[0].errorMessage);
          }
        }

        onUploadComplete(urls);
        setFiles([]);
      } catch (error) {
        console.error('Failed to upload files.', error);
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


