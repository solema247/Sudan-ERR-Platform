// pages/scan-prefill-form.tsx

import React, { useState, useEffect } from 'react';
import PrefilledForm from '../components/PrefilledForm';
import { useRouter } from 'next/router';

const ScanPrefillForm: React.FC = () => {
  const [structuredData, setStructuredData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Retrieve data from localStorage
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
      alert('Form submitted successfully!');
      router.push('/menu'); // Navigate back to the menu or main chat view
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to submit the form. Please try again.');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!structuredData) {
    return <div>No data available</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Prefilled Form</h2>
      <PrefilledForm data={structuredData} onSubmit={handleFormSubmit} />
    </div>
  );
};

export default ScanPrefillForm;
