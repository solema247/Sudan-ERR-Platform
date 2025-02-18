import React, { useState, useId } from "react";
import { Upload as UploadIcon, Trash2, Check } from "lucide-react";
import { supabase } from '../../../../services/supabaseClient';
import { useTranslation } from 'react-i18next';
import * as tus from 'tus-js-client';

export enum reportUploadType {
  RECEIPT,
  SUPPORTING
}

interface UploadChooserProps {
  uploadType: reportUploadType;  
  projectId: string;
  reportId: string;
  receiptId?: string;
}

interface FileWithProgress {
  file: File;
  uploaded: boolean;
  progress: number;
}

interface UploadedListProps {
  files: FileWithProgress[];
  removeFile: (index: number) => void;
}



export const UploadChooser: React.FC<UploadChooserProps> = ({ uploadType, projectId, reportId, receiptId }:UploadChooserProps) => {
  const id = useId();
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const BUCKET_NAME = "images";
  const SUPABASE_PROJECT_ID = "inrddslmakqrezinnejh"; // TODO: Move into env.local.

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []).map((file) => ({ file, uploaded: false, progress: 0 }));
    setFiles((prevFiles) => [...prevFiles, ...selectedFiles]);

    // Starts uploading right away.

    // selectedFiles.forEach(async (newFile) => {
    //   await beginUploadProcessFor(newFile, uploadType, projectId, reportId);         // TODO: Make this typesefae
    // })
  }
      
  const beginUploadProcessFor = async (newFile, uploadType, projectId, reportId) => {
  // const filename = getNewFilename(newFile);
    const filename = "test.png";
    const uploadPath = getUploadPath(newFile, uploadType, projectId, reportId);

    // TODO: Compression

    // TUC process
    const { data: { session } } = await supabase.auth.getSession()

    return new Promise((resolve, reject) => {
      var upload = new tus.Upload(newFile.file, {
          endpoint: `https://${SUPABASE_PROJECT_ID}.supabase.co/storage/v1/upload/resumable`,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: {
              authorization: `Bearer ${session.access_token}`,
              'x-upsert': 'true',
          },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true, // Important if you want to allow re-uploading the same file https://github.com/tus/tus-js-client/blob/main/docs/api.md#removefingerprintonsuccess
          metadata: {
              bucketName: BUCKET_NAME,
              objectName: filename,
              contentType: 'image/png'
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
              // console.log('Download %s from %s', upload.file.name, upload.url)
              // resolve()
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

  // ${projectId}/${reportId}/${newFile.file.name}`;
  // TODO: does this include filename
  const getUploadPath = (filename: string, uploadType: reportUploadType, projectId: string, reportId: string) => {

    switch(uploadType) {
      case reportUploadType.RECEIPT:
        return `images/projects/{projectId}/reports/{reportId}/receipts/{filename}`
        break;
      case reportUploadType.SUPPORTING:
        `images/projects/{projectId}/reports/{reportId}/{filename}`
        break;
    }
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



const UploadedList: React.FC<UploadedListProps> = ({ files, removeFile }) => {
  const { t } = useTranslation('fillForm');

  return (
    <div>
      {files.length > 0 && (
        <div className="mt-4">
          <ul className="space-y-2">
            {files.map(({ file, uploaded, progress }, index) => (
              <li key={index} className="flex items-center justify-between gap-4 p-2 border rounded-md">
                <span className="truncate">{file.name}</span>
                <div className="flex items-center gap-2">
                  {uploaded ? <Check className="text-green-500" size={16} /> : (
                    <div className="w-20 h-2 bg-gray-200 rounded">
                      <div className="h-2 bg-blue-500 rounded" style={{ width: `${progress}%` }}></div>
                    </div>
                  )}
                  <button onClick={() => removeFile(index)} className="text-red-500 hover:text-red-700 text-xs">
                    {t('Remove').toLowerCase()}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}