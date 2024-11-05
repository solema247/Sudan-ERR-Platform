// pages/scan-form.tsx

import React, { useState } from 'react';
import ScanBubble from '../components/ScanBubble';
import MessageBubble from '../components/MessageBubble';
import PrefilledForm from '../components/PrefilledForm';

const ScanForm: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [structuredData, setStructuredData] = useState<any>(null); // State for structured data

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      console.log('File selected:', e.target.files[0].name); // Log file name to confirm selection
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

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server responded with an error:', response.statusText, errorText);
        throw new Error(`Server Error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Scan successful, displaying prefilled form in chat', data);

      // Store the structured data in state
      setStructuredData(data.data);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to scan the form.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <ScanBubble>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Scan Form</h2>
          <input type="file" accept="image/*" onChange={handleFileChange} />
          <button
            onClick={handleUpload}
            className="bg-blue-500 text-white py-2 px-4 rounded"
            disabled={!file || isLoading}
          >
            {isLoading ? 'Processing...' : 'Upload and Scan'}
          </button>
        </div>
      </ScanBubble>

      {/* Conditionally render PrefilledForm as a chat bubble */}
      {structuredData && (
        <MessageBubble>
          <PrefilledForm data={structuredData} />
        </MessageBubble>
      )}
    </>
  );
};

export default ScanForm;
