// pages/offline-mode.tsx
import React, { useState } from 'react';
import OfflineForm from '../components/OfflineForm';

const OfflineMode: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    console.log('Close button clicked'); // Add for debugging
    setIsModalOpen(false);
  };

  const handleSubmitSuccess = () => {
    setIsModalOpen(false);
    alert('Form submitted successfully!');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-3xl font-bold mb-4">Welcome to Offline Mode</h1>
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
