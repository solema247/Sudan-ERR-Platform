import React, { useState } from "react";
import { Upload as UploadIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { UploadedList } from "./UploadedList";
import { FileWithProgress } from "./UploadInterfaces";
import { supabase } from "../../../../services/supabaseClient";
import performUpload from './performUpload';

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
}

export const UploadChooserSupporting: React.FC<UploadChooserProps> = ({
  id,
  uploadType,
  projectId,
  expenseId,
}: UploadChooserProps) => {

  const [files, setFiles] = useState<FileWithProgress[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {

  const BUCKET_NAME = "images";

  const selectedFiles: FileWithProgress[] = Array.from(e.target.files || []).map((file) => ({
      file,
      uploaded: false,
      progress: 0,
      startedUploading: false
    }));

    setFiles((prevState) => [...prevState, ...selectedFiles]);
    selectedFiles.forEach((file, index) => performUpload(BUCKET_NAME, "filenameTODO", file.file)); 
  };

  const removeFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };


  return (
    <div className="max-w-lg mx-auto">
      <div className="flex flex-col gap-4">
        <UploadBox
          uploadType={uploadType}
          onFileChange={handleFileChange}
        />
        <UploadedList files={files} removeFile={removeFile} />
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

