import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ReceiptChooser {
    onFileSelect: (file: File) => void;
    onError: (error: string) => void;
}

const ReceiptChooser: React.FC<ReceiptChooser> = ({ 
    onFileSelect, 
    onError 
}) => {
    const { t } = useTranslation('fillForm');
    const [selectedFileName, setSelectedFileName] = useState<string>('');
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > MAX_FILE_SIZE) {
            onError(t('fileTooBig', { size: '10MB' }));
            return;
        }

        // Store file name for display
        setSelectedFileName(file.name);
        
        // Pass the file up to parent instead of uploading
        onFileSelect(file);
    };

    return (
        <div className="mt-2">
            <label className="block text-sm font-medium text-gray-700">
                {t('uploadReceipt')}
                <div className="relative mt-1">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="text-sm text-gray-500
                        py-2 px-4
                        rounded-full border
                        bg-primaryGreen text-white
                        hover:bg-green-600 transition-colors
                        inline-block">
                        {t('chooseReceiptFile')}
                    </div>
                    <span className="ml-3 text-sm text-gray-500">
                        {selectedFileName ? selectedFileName : t('noFileChosen')}
                    </span>
                </div>
            </label>
        </div>
    );
};

export default ReceiptChooser; 