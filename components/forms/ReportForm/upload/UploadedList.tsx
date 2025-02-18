
import React, { useState } from "react";
import { useTranslation } from 'react-i18next';
import { FileWithProgress } from "./UploadInterfaces";
import { Upload as UploadIcon, Trash2, Check } from "lucide-react";



interface UploadedListProps {
    files: FileWithProgress[];
    removeFile: (index: number) => void;
}

export const UploadedList: React.FC<UploadedListProps> = ({ files, removeFile }) => {
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