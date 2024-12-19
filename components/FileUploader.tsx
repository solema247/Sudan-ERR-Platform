// Components/FileUploader.tsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

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

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(",")[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(selectedFiles);

      setUploading(true);
      const urls: string[] = [];

      try {
        for (const file of selectedFiles) {
          const base64Content = await convertToBase64(file);

          const response = await fetch("/api/upload", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fileName: `${file.name}-${Date.now()}`,
              fileContent: base64Content,
            }),
          });

          if (!response.ok) {
            throw new Error(t("errors.upload_failed"));
          }

          const result = await response.json();
          urls.push(result.url);
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


