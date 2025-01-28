import React, { useState } from "react";
import { Upload, Trash2 } from "lucide-react";

// TODO: Localize

enum ReportFileType {
  RECEIPT,
  SUPPORTING
}

interface UploadChooserProps {
  selectedFiles: string[];
  projectId: string;
  reportId: string;
  uploadType: ReportFileType;
}

const UploadChooser: React.FC<UploadChooserProps> = ({ selectedFiles, projectId, reportId, uploadType: UploadChooserProps }: UploadChooserProps) => {
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles((prevFiles) => [...prevFiles, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    console.log("Uploading files:", files);
    // Add upload logic here (e.g., API call)
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex flex-col gap-4">
        <UploadBox onFileChange={handleFileChange} />
        <UploadedList files={files} removeFile={removeFile} />
        {files.length > 0 && (
          <PerformUploadButton onUpload={handleUpload} />
        )}
      </div>
    </div>
  );
};



interface UploadBoxProps {
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const UploadBox: React.FC<UploadBoxProps> = ({ onFileChange }) => {
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
        Choose Files
      </label>
    </div>
  );
};

interface UploadedListProps {
  files: File[];
  removeFile: (index: number) => void;
}

const UploadedList: React.FC<UploadedListProps> = ({ files, removeFile }) => {
  return (
    <div>
      {files.length > 0 && (
        <div className="mt-4">
          <ul className="space-y-2">
            {files.map((file, index) => (
              <li
                key={index}
                className="flex items-center justify-between p-2 border rounded-md"
              >
                <span className="truncate">{file.name}</span>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

interface PerformUploadButtonProps {
  onUpload: () => void;
}

const PerformUploadButton: React.FC<PerformUploadButtonProps> = ({ onUpload }) => {
  return (
    <button
      onClick={onUpload}
      className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600"
    >
      Upload Files
    </button>
  );
};

export default UploadChooser;
