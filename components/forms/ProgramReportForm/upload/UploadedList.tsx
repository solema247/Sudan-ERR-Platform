import React from 'react';
import { useTranslation } from 'react-i18next';
import { FileWithProgress, UploadedFile } from './UploadInterfaces';
import { Trash2, FileText, Image, Check } from 'lucide-react';

interface Props {
    uploadingFiles: FileWithProgress[];
    uploadedFiles: UploadedFile[];
    onRemoveUploaded: (id: string) => void;
}

const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5 text-gray-400" />;
    if (fileType.includes('image')) return <Image className="h-5 w-5 text-gray-400" />;
    return <FileText className="h-5 w-5 text-gray-400" />;
};

export const UploadedList: React.FC<Props> = ({
    uploadingFiles,
    uploadedFiles,
    onRemoveUploaded
}) => {
    const { t } = useTranslation('program-report');

    return (
        <div className="mt-4 space-y-2">
            {uploadingFiles.map((file, index) => (
                <div key={index} className="bg-white border rounded-lg p-4">
                    <div className="flex items-center">
                        {getFileIcon(file.file.type)}
                        <div className="ml-3 flex-1">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{file.file.name}</p>
                                    <p className="text-xs text-gray-500">{formatFileSize(file.file.size)}</p>
                                </div>
                                <Check className="h-5 w-5 text-green-500" />
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {uploadedFiles.map((file) => (
                <div key={file.id} className="bg-white border rounded-lg p-4">
                    <div className="flex items-center">
                        {getFileIcon(file.file_type)}
                        <div className="ml-3 flex-1">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{file.file_name}</p>
                                    <p className="text-xs text-gray-500">{formatFileSize(file.file_size)}</p>
                                </div>
                                <button
                                    onClick={() => onRemoveUploaded(file.id)}
                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default UploadedList; 