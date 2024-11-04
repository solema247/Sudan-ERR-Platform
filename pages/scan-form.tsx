// pages/scan-form.tsx
import React, { useState } from 'react';
import ScanBubble from '../components/ScanBubble';
import { useRouter } from 'next/router';

const ScanForm: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [extractedData, setExtractedData] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/scan-form', {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            setExtractedData(data.message || 'No data extracted');
        } catch (error) {
            console.error('Error uploading file:', error);
            setExtractedData('Failed to scan the form.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!extractedData) return;

        try {
            const response = await fetch('/api/scan-form/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ structured_data: extractedData }),
            });
            const data = await response.json();
            alert(data.message);
            router.push('/'); // Return to the main page or menu after confirmation
        } catch (error) {
            console.error('Error saving confirmed data:', error);
        }
    };

    return (
        <ScanBubble>
            <div className="space-y-4">
                <h2 className="text-lg font-semibold">Scan Form</h2>
                <input type="file" accept="image/*" onChange={handleFileChange} />
                <button onClick={handleUpload} className="bg-blue-500 text-white py-2 px-4 rounded" disabled={!file || isLoading}>
                    {isLoading ? 'Processing...' : 'Upload and Scan'}
                </button>
                {extractedData && (
                    <div className="space-y-2">
                        <textarea
                            value={extractedData}
                            onChange={(e) => setExtractedData(e.target.value)}
                            rows={10}
                            className="w-full p-2 border rounded"
                        />
                        <button onClick={handleConfirm} className="bg-green-500 text-white py-2 px-4 rounded">
                            Confirm and Save
                        </button>
                    </div>
                )}
            </div>
        </ScanBubble>
    );
};

export default ScanForm;
