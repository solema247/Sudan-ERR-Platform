import React, { useState, useEffect } from 'react';
import PrefilledForm from '../components/PrefilledForm';

const ScanPrefillForm: React.FC = () => {
  const [structuredData, setStructuredData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Retrieve data from localStorage instead of fetching from an API
    const data = localStorage.getItem('prefillData');
    if (data) {
      try {
        const parsedData = JSON.parse(data);
        if (parsedData && parsedData.date && parsedData.expenses) { // Basic structure check
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

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!structuredData) {
    return <div>No data available</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Prefilled Form</h2>
      <PrefilledForm data={structuredData} />
    </div>
  );
};

export default ScanPrefillForm;
