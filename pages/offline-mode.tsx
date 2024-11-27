// pages/offline-mode.tsx
import React, { useState, useEffect } from 'react';
import OfflineForm from '../components/OfflineForm';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/router';

const OfflineMode: React.FC = () => {
  const { t } = useTranslation('offlineMode'); // Load translations for offline mode
  const router = useRouter(); // Initialize router
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check if there's a success message in localStorage
    const successMessage = localStorage.getItem('offlineSubmissionSuccess');
    if (successMessage) {
      setSubmissionMessage(successMessage);
      localStorage.removeItem('offlineSubmissionSuccess'); // Clear the flag after showing the message
    }

    // Listen for the offlineFormSubmitted event
    const handleOfflineFormSubmitted = (event: CustomEvent) => {
      setSubmissionMessage(event.detail.message);
      setTimeout(() => setSubmissionMessage(null), 3000); // Hide the message after 3 seconds
    };

    window.addEventListener('offlineFormSubmitted', handleOfflineFormSubmitted);

    // Cleanup the event listener
    return () => {
      window.removeEventListener('offlineFormSubmitted', handleOfflineFormSubmitted);
    };
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

  const handleReturnToHome = () => {
    router.push('/'); // Navigate back to the home page
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4">
      {/* Instructions */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-semibold text-black mb-4">{t('instructions_title')}</h1>
        <ul className="text-lg text-gray-700 space-y-2">
          <li>
            <span role="img" aria-label="form">📝</span> {t('instructions_step_1')}
          </li>
          <li>
            <span role="img" aria-label="fields">✅</span> {t('instructions_step_2')}
          </li>
          <li>
            <span role="img" aria-label="upload">📤</span> {t('instructions_step_3')}
          </li>
        </ul>
      </div>

      {/* Success Message */}
      {submissionMessage && (
        <div className="bg-green-100 text-green-700 px-4 py-2 rounded shadow mb-6">
          {submissionMessage}
        </div>
      )}

      {/* Open Form Button */}
      <button
        onClick={handleOpenModal}
        className="bg-primaryGreen hover:bg-primaryGreenHover text-white font-medium py-2 px-6 rounded shadow mb-4"
      >
        {t('open_form_button')}
      </button>

      {/* Return to Home Button */}
      <button
        onClick={handleReturnToHome}
        className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-6 rounded shadow"
      >
        {t('return_home_button')}
      </button>

      {/* Modal */}
      {isModalOpen && (
        <OfflineForm onClose={handleCloseModal} onSubmitSuccess={handleSubmitSuccess} />
      )}
    </div>
  );
};

export default OfflineMode;



