import React, { useState } from "react";
import { Upload as UploadIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { UploadedList } from "./UploadedList";
import { FileWithProgress, FilesDictionary } from "./UploadInterfaces";

export enum reportUploadType {
  RECEIPT,
  SUPPORTING,
}

export interface UploadChooserProps {
  uploadType: reportUploadType;
  projectId: string;
  reportId: string;
  expenseId?: string;
  filesState: [FilesDictionary, React.Dispatch<React.SetStateAction<FilesDictionary>>];
}

export const UploadChooser: React.FC<UploadChooserProps> = ({
  uploadType,
  projectId,
  expenseId,
  filesState,
}: UploadChooserProps) => {
  const key = uploadType === reportUploadType.SUPPORTING ? "SUPPORTING" : `RECEIPT-${expenseId}`;
  const [files, setFiles] = filesState; // Destructure from the prop

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles: FileWithProgress[] = Array.from(e.target.files || []).map((file) => ({
      file,
      uploaded: false,
      progress: 0,
    }));

    setFiles((prevFiles) => ({
      ...prevFiles,
      [key]: [...(prevFiles[key] || []), ...selectedFiles],
    }));
  };

  const removeFile = (index: number) => {
    setFiles((prevFiles) => {
      const updatedFiles = (prevFiles[key] || []).filter((_, i) => i !== index);
      const newFiles = { ...prevFiles };
      if (updatedFiles.length > 0) {
        newFiles[key] = updatedFiles;
      } else {
        delete newFiles[key];
      }
      return newFiles;
    });
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex flex-col gap-4">
        <p>{key}</p>
        <UploadBox onFileChange={handleFileChange} uploadType={uploadType} />
        <UploadedList id={key} files={files[key] || []} removeFile={removeFile} />
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
      <input type="file" multiple id="file-upload" className="hidden" onChange={onFileChange} />
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
