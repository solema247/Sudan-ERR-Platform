import React, { useState } from "react";
import { Upload as UploadIcon } from "lucide-react";
import { supabase } from '../../../../services/supabaseClient';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { UploadedList } from './UploadedList';
import { FileWithProgress } from './UploadInterfaces';

import * as tus from 'tus-js-client'; 

export enum reportUploadType {
  RECEIPT,
  SUPPORTING
}

export interface UploadChooserProps {
  uploadType: reportUploadType;  
  projectId: string;
  reportId: string;
  receiptId?: string;
}


export const UploadChooser: React.FC<UploadChooserProps> = ({ uploadType, projectId, reportId, receiptId }:UploadChooserProps) => {
  const id = uuidv4();
  const [files, setFiles] = useState<FileWithProgress[]>([]); // TODO: Base this on a dictionary as a hack around state share.
  const BUCKET_NAME = "images";
  const SUPABASE_PROJECT_ID = "inrddslmakqrezinnejh"; // TODO: Move into env.local.

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []).map((file) => ({ file, uploaded: false, progress: 0 }));
    setFiles((prevFiles) => {
      console.log("Previous Files:", prevFiles);
      return [...prevFiles, ...selectedFiles];
    })

    // Starts uploading right away.

    // selectedFiles.forEach(async (newFile) => {
    //   await beginUploadProcessFor(newFile, uploadType, projectId, reportId);         // TODO: Make this typesefae
    // })
  }
      

  const removeFile = (index: number) => {
    // TODO
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex flex-col gap-4">
        <UploadBox key={id} onFileChange={handleFileChange} uploadType={uploadType} />
        <UploadedList key={id} files={files} removeFile={removeFile} />
      </div>
    </div>
  );  
}

interface UploadBoxProps {
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadType: reportUploadType;
}

const UploadBox: React.FC<UploadBoxProps> = ({ onFileChange, uploadType }) => {
  const { t } = useTranslation('fillForm');

  return (
    <div className="border-dashed border-2 border-gray-300 p-4 rounded-md">
      <input type="file" multiple id="file-upload" className="hidden" onChange={onFileChange} />
      <label htmlFor="file-upload" className="flex items-center justify-center p-4 border rounded-md cursor-pointer hover:bg-gray-50">
        <UploadIcon className="mr-2" />
        {uploadType === reportUploadType.RECEIPT ? <span>{t('chooseReceiptFiles')}</span> : <span>{t('choosefiles')}</span>}
      </label>
    </div>
  );
};
