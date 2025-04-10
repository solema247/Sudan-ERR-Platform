import React, { useState } from "react";
import { Upload as UploadIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { UploadedList } from "./UploadedList";
import { FileWithProgress } from "./UploadInterfaces";
import performUpload from './performUpload';
import { v4 as uuidv4 } from 'uuid';
import { postImageRecordToDb } from './postImageRecordToDb';

export enum reportUploadType {
  RECEIPT,
  SUPPORTING,
}

export interface UploadChooserProps {
  id: string;
  uploadType: reportUploadType;
  projectId: string;
  reportId: string;
  expenseId?: string;
  onChange?: (fileWithProgress: FileWithProgress) => void;
}

export const UploadChooserSupporting: React.FC<UploadChooserProps> = ({
  id,
  projectId,
  reportId,
  expenseId,
  onChange,
}: UploadChooserProps) => {

  const [filesWithProgress, setFilesWithProgress] = useState<FileWithProgress[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const newFiles = Array.from(e.target.files).map((file) => ({
      id: uuidv4(),
      file,
      uploaded: false,
      progress: 0,
    }));

    setFilesWithProgress((prev) => [...prev, ...newFiles]);

    for (const fileWithProgress of newFiles) {
      const path = getPath(fileWithProgress.file, projectId, reportId);
      
      try {
        await performUpload(fileWithProgress.file, path, {
          onProgress: (progress) => {
            setFilesWithProgress((prev) =>
              prev.map((f) =>
                f.id === fileWithProgress.id ? { ...f, progress } : f
              )
            );
          },
          onSuccess: async (url) => {
            console.log('Upload successful, got URL:', url);
            
            setFilesWithProgress((prev) =>
              prev.map((f) =>
                f.id === fileWithProgress.id ? { ...f, uploaded: true } : f
              )
            );

            // Store the URL in the form data
            if (onChange) {
              onChange({
                id: fileWithProgress.id,
                file: fileWithProgress.file,
                uploaded: true,
                progress: 100,
                uploadedUrl: url
              });
            }
          },
          onError: (error) => {
            setFilesWithProgress((prev) =>
              prev.map((f) =>
                f.id === fileWithProgress.id ? { ...f, error } : f
              )
            );
          },
        });
      } catch (error) {
        console.error("Upload failed:", error);
      }
    }
  };

  const getPath = (file: File, projectId: string, reportId: string) => `projects/${projectId}/reports/${reportId}/${file.name}`;

  const removeFile = (index: number) => {
    setFilesWithProgress((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };


  return (
    <div className="max-w-lg mx-auto">
      <div className="flex flex-col gap-4">
        <UploadBox
          uploadType={reportUploadType.SUPPORTING}
          onFileChange={handleFileChange}
        />
        <UploadedList files={filesWithProgress} removeFile={removeFile} />
      </div>
    </div>
  );
};

interface UploadBoxProps {
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadType: reportUploadType;
}

const UploadBox: React.FC<UploadBoxProps> = ({ onFileChange, uploadType }) => {
  const { t } = useTranslation("fillForm");

  return (
    <div className="border-dashed border-2 border-gray-300 p-4 rounded-md">
      <input
        type="file"
        multiple
        id="file-upload"
        className="hidden"
        onChange={onFileChange}
      />
      <label
        htmlFor="file-upload"
        className="flex items-center justify-center p-4 border rounded-md cursor-pointer hover:bg-gray-50"
      >
        <UploadIcon className="mr-2" />
        {uploadType === reportUploadType.RECEIPT ? (
          <span>{t("chooseReceiptFiles")}</span>
        ) : (
          <span>{t("chooseFiles")}</span>
        )}
      </label>
    </div>
  );
};

