// pages/scan-prefill-form.tsx
import React, { useState, useEffect } from 'react';
import PrefilledForm from '../components/PrefilledForm';
import FileUploader from '../components/FileUploader';
import MessageBubble from '../components/MessageBubble'; // Ensure MessageBubble is imported

const ScanPrefillForm: React.FC = () => {
  const [structuredData, setStructuredData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showFileUploader, setShowFileUploader] = useState(false);
  const [showCompletionOptions, setShowCompletionOptions] = useState(false);

  useEffect(() => {
    const data = localStorage.getItem('prefillData');
    if (data) {
      try {
        const parsedData = JSON.parse(data);
        if (parsedData && parsedData.date && parsedData.expenses) { 
          setStructuredData(parsedData);
        } else {
          console.error('Invalid prefill data structure');
        }
      } catch (error) {
        console.error('Failed to parse prefill data:', error);
      }
    } else {
      console.error('No prefill data found in localStorage');
    }
    setLoading(false);
  }, []);

  const handleFormSubmit = async (formData: any) => {
    try {
      const response = await fetch('/api/submit-prefilled-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit form');
      }

      const result = await response.json();
      console.log('Form submitted successfully:', result);

      setShowFileUploader(true);
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to submit the form. Please try again.');
    }
  };

  const handleUploadComplete = () => {
    alert('Files uploaded successfully!');
    setShowFileUploader(false);
    setShowCompletionOptions(true);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!structuredData) {
    return <div>No data available</div>;
  }

  return (
    <div className="p-4">
      {!showFileUploader && !showCompletionOptions ? (
        <>
          <h2 className="text-lg font-semibold mb-4">Prefilled Form</h2>
          <PrefilledForm data={structuredData} onFormSubmit={handleFormSubmit} />
        </>
      ) : showFileUploader ? (
        <>
          <h2 className="text-lg font-semibold mb-4">Upload Photos</h2>
          <FileUploader onUploadComplete={handleUploadComplete} />
        </>
      ) : (
        <>
          <MessageBubble>
            <p>Form and photos uploaded successfully!</p>
          </MessageBubble>
          <MessageBubble>
            <button onClick={() => setShowFileUploader(false)} className="bg-blue-500 text-white py-2 px-4 rounded mt-4">
              Scan Another Form
            </button>
            <button onClick={() => window.location.href = '/menu'} className="bg-green-500 text-white py-2 px-4 rounded mt-4 ml-2">
              Return to Menu
            </button>
          </MessageBubble>
        </>
      )}
    </div>
  );
};

export default ScanPrefillForm;
