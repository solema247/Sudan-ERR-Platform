// pages/offline-mode.tsx
import React, { useState, useEffect } from 'react';
import OfflineForm from '../components/OfflineForm';
import { useTranslation } from 'react-i18next';

const OfflineMode: React.FC = () => {
  const { t } = useTranslation('offlineMode'); // Load translations for offline mode
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
    console.log(t('close_button_clicked')); // Log message with translation
    setIsModalOpen(false);
  };

  const handleSubmitSuccess = () => {
    setIsModalOpen(false);
    alert(t('form_submit_success'));
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-3xl font-bold mb-4">{t('welcome_message')}</h1>

      {submissionMessage && (
        <div className="bg-green-100 text-green-700 p-4 rounded mb-4">
          {submissionMessage}
        </div>
      )}

      <button
        onClick={handleOpenModal}
        className="bg-blue-500 text-white py-2 px-4 rounded shadow"
      >
        {t('open_form_button')}
      </button>
      {isModalOpen && (
        <OfflineForm onClose={handleCloseModal} onSubmitSuccess={handleSubmitSuccess} />
      )}
    </div>
  );
};

export default OfflineMode;
