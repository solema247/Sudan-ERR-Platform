import React, { useState } from "react";
import { Upload, Trash2, Check } from "lucide-react";
import { supabase } from '../../../../services/supabaseClient';

// TODO: Get the correct bucket.

export enum reportUploadType {
  RECEIPT,
  SUPPORTING
}

interface UploadChooserProps {
  projectId: string;
  reportId: string;
  uploadType: reportUploadType;
}

interface FileWithProgress {
  file: File;
  uploaded: boolean;
  progress: number;
}

export const UploadChooser: React.FC<UploadChooserProps> = ({ projectId, reportId, uploadType: UploadChooserProps }: UploadChooserProps) => {
  const [files, setFiles] = useState<FileWithProgress[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []).map((file) => ({ file, uploaded: false, progress: 0 }));
    setFiles((prevFiles) => [...prevFiles, ...selectedFiles]);
  
    selectedFiles.forEach(async (newFile) => {
      const uploadPath = `${projectId}/${reportId}/${newFile.file.name}`;
      const chunkSize = 1024 * 1024; // 1MB chunk size
      const totalChunks = Math.ceil(newFile.file.size / chunkSize);
  
      try {
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
          const start = chunkIndex * chunkSize;
          const end = Math.min(start + chunkSize, newFile.file.size);
          const chunk = newFile.file.slice(start, end);
  
          const { error } = await supabase.storage.from("your-bucket-name").upload(`${uploadPath}.chunk${chunkIndex}`, chunk, { upsert: true });
  
          if (error) {
            console.error("Chunk upload error:", error);
            return;
          }
  
          const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
          setFiles((prevFiles) => {
            const updatedFiles = [...prevFiles];
            const fileIndex = prevFiles.findIndex((f) => f.file === newFile.file);
            if (fileIndex >= 0) {
              updatedFiles[fileIndex] = {
                ...updatedFiles[fileIndex],
                progress,
              };
            }
            return updatedFiles;
          });
        }
  
        // Mark as uploaded
        setFiles((prevFiles) => {
          const updatedFiles = [...prevFiles];
          const fileIndex = prevFiles.findIndex((f) => f.file === newFile.file);
          if (fileIndex >= 0) {
            updatedFiles[fileIndex] = {
              ...updatedFiles[fileIndex],
              uploaded: true,
              progress: 100,
            };
          }
          return updatedFiles;
        });
      } catch (err) {
        console.error("Unexpected upload error:", err);
      }
    });
  };
  
  const removeFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex flex-col gap-4">
        <UploadBox onFileChange={handleFileChange} uploadType = {reportUploadType.RECEIPT} />
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
        <Upload className="mr-2" />
        {uploadType == reportUploadType.RECEIPT ? 
        (
          <span>Choose Receipt Files</span>
         ) 
         : 
         ( 
          <span>
           Choose Files
           </span>
          ) 
        }
      </label>
    </div>
  );
};

interface UploadedListProps {
  files: FileWithProgress[];
  removeFile: (index: number) => void;
}

const UploadedList: React.FC<UploadedListProps> = ({ files, removeFile }) => {
  return (
    <div>
      {files.length > 0 && (
        <div className="mt-4">
          <ul className="space-y-2">
            {files.map(({ file, uploaded, progress }, index) => (
              <li
                key={index}
                className="flex items-center justify-between gap-4 p-2 border rounded-md"
              >
                <span className="truncate">{file.name}</span>
                <div className="flex items-center gap-2">
                  {uploaded ? (
                    <Check className="text-green-500" size={16} />
                  ) : (
                    <div className="w-20 h-2 bg-gray-200 rounded">
                      <div
                        className="h-2 bg-blue-500 rounded"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  )}
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
