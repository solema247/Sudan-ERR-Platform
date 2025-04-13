import React, { useRef, DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FileWithProgress } from './UploadInterfaces';

interface Props {
    onFilesSelected: (files: FileWithProgress[]) => void;
    disabled?: boolean;
}

export const UploadChooserSupporting: React.FC<Props> = ({ onFilesSelected, disabled }) => {
    const { t } = useTranslation('program-report');
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const handleFiles = (files: FileList | null) => {
        if (files) {
            const filesWithProgress: FileWithProgress[] = Array.from(files).map(file => ({
                file,
                progress: 0
            }));
            onFilesSelected(filesWithProgress);
        }
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        handleFiles(e.dataTransfer.files);
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    return (
        <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
        >
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
                <span>{t('upload.chooseFiles')}</span>
            </button>
            <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
            />
        </div>
    );
}; 