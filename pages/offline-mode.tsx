// pages/offline-mode.tsx
import React, { useState, useEffect } from 'react';
import OfflineForm from '../components/OfflineForm';

const OfflineMode: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check if there's a success message in localStorage
    const successMessage = localStorage.getItem('offlineSubmissionSuccess');
    if (successMessage) {
      setSubmissionMessage(successMessage);
      localStorage.removeItem('offlineSubmissionSuccess'); // Clear the flag after showing the message
    }
  }, []);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    console.log('Close button clicked');
    setIsModalOpen(false);
  };

  const handleSubmitSuccess = () => {
    setIsModalOpen(false);
    alert('Form submitted successfully!');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-3xl font-bold mb-4">Welcome to Offline Mode</h1>

      {submissionMessage && (
        <div className="bg-green-100 text-green-700 p-4 rounded mb-4">
          {submissionMessage}
        </div>
      )}

      <button
        onClick={handleOpenModal}
        className="bg-blue-500 text-white py-2 px-4 rounded shadow"
      >
        Open Offline Form
      </button>
      {isModalOpen && (
        <OfflineForm onClose={handleCloseModal} onSubmitSuccess={handleSubmitSuccess} />
      )}
    </div>
  );
};

export default OfflineMode;