import React, { useState } from "react";
import { Upload as UploadIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { UploadedList } from "./UploadedList";
import { FileWithProgress } from "./UploadInterfaces";
import { supabase } from "../../../../services/supabaseClient";
import * as tus from "tus-js-client";

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

    const selectedFiles: FileWithProgress[] = Array.from(e.target.files || []).map((file) => ({
      file,
      uploaded: false,
      progress: 0,
      startedUploading: false
    }));

    setFiles((prevState) => [...prevState, ...selectedFiles]);
    selectedFiles.forEach((fileObj, index) => beginFileUpload(fileObj, index));     
  };

  const beginFileUpload(fileObj: File, index: number) {
    
  }

  const removeFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const supabaseProjectId = "inrddslmakqrezinnejh";

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

async function uploadFile(bucketName, fileName, file) {
    const { data: { session } } = await supabase.auth.getSession()

    return new Promise((resolve, reject) => {
        var upload = new tus.Upload(file, {
            endpoint: `https://${projectId}.supabase.co/storage/v1/upload/resumable`,
            retryDelays: [0, 3000, 5000, 10000, 20000],
            headers: {
                authorization: `Bearer ${session.access_token}`,
                'x-upsert': 'true', // optionally set upsert to true to overwrite existing files
            },
            uploadDataDuringCreation: true,
            removeFingerprintOnSuccess: true, // Important if you want to allow re-uploading the same file https://github.com/tus/tus-js-client/blob/main/docs/api.md#removefingerprintonsuccess
            metadata: {
                bucketName: bucketName,
                objectName: fileName,
                contentType: 'image/png',
                cacheControl: '3600'
            },
            chunkSize: 6 * 1024 * 1024, // NOTE: it must be set to 6MB (for now) do not change it
            onError: function (error) {
                console.log('Failed because: ' + error)
                reject(error)
            },
            onProgress: function (bytesUploaded, bytesTotal) {
                var percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2)
                console.log(bytesUploaded, bytesTotal, percentage + '%')
            },
            onSuccess: function () {
                console.log("Uploaded: " + upload.url)
                resolve(true)   // TODO: Check that this is the type we want.
            },
        })

        return upload.findPreviousUploads().then(function (previousUploads) {
            // Found previous uploads so we select the first one.
            if (previousUploads.length) {
                upload.resumeFromPreviousUpload(previousUploads[0])
            }

            // Start the upload
            upload.start()
        })
    })
}


