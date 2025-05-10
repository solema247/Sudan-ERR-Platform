import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FileWithProgress } from './UploadInterfaces';

interface UploadChooserSupportingProps {
    onFilesSelected: (files: FileWithProgress[]) => void;
    disabled?: boolean;
}

const UploadChooserSupporting: React.FC<UploadChooserSupportingProps> = React.memo(({ 
    onFilesSelected, 
    disabled 
}) => {
    const { t } = useTranslation('program-report');
    const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = event.target.files;
        if (!fileList) return;

        const files: FileWithProgress[] = Array.from(fileList).map(file => ({
            file,
            progress: 0
        }));

        onFilesSelected(files);
        
        // Reset the input value so the same file can be selected again if needed
        event.target.value = '';
    }, [onFilesSelected]);

    return (
        <div className="mb-4">
            <input
                type="file"
                onChange={handleFileChange}
                disabled={disabled}
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
            />
        </div>
    );
});

UploadChooserSupporting.displayName = 'UploadChooserSupporting';

export default UploadChooserSupporting; 