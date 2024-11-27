// pages/offline-mode.tsx
import React, { useState, useEffect } from 'react';
import OfflineForm from '../components/OfflineForm';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/router';
import { getSessionQueue, clearSessionQueue, getSubmittedQueue } from '../lib/sessionUtils'; // Import session utilities

const OfflineMode: React.FC = () => {
  const { t } = useTranslation('offlineMode'); // Load translations for offline mode
  const router = useRouter(); // Initialize router
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null);
  const [queuedForms, setQueuedForms] = useState<any[]>([]); // State to hold session forms
  const [submittedForms, setSubmittedForms] = useState<any[]>([]); // State to hold submitted forms

  // Load queued forms on component mount
  useEffect(() => {
    const fetchQueuedForms = () => {
      const queue = getSessionQueue();
      setQueuedForms(queue || []);
      const submittedQueue = getSubmittedQueue();
      setSubmittedForms(submittedQueue || []);
    };

    fetchQueuedForms();

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
      fetchQueuedForms(); // Refresh queued forms
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

  // Function to clear the submitted forms list
  const handleClearSubmitted = () => {
    setSubmittedForms([]); // Clear the submitted forms state
    localStorage.removeItem('offlineSubmittedQueue'); // Clear submitted forms from localStorage
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

      {/* Queued and Submitted Forms */}
      <div className="w-full max-w-md mb-6">
          {/* Queued Forms */}
          {queuedForms.length > 0 ? (
              <div className="bg-white p-4 rounded shadow mb-6">
                  <h2 className="text-lg font-medium text-gray-800 mb-2">{t('queued_forms_title')}</h2>
                  <ul className="space-y-2">
                      {queuedForms.map((form, index) => (
                          <li key={index} className="bg-gray-50 p-2 rounded border border-gray-200 text-sm text-gray-700">
                              <p>
                                  <strong>{t('queued_form_id')}:</strong> {form.formData.err_id || t('unknown')}
                              </p>
                              <p>
                                  <strong>{t('queued_form_date')}:</strong> {form.formData.date || t('unknown')}
                              </p>
                              <p className="text-yellow-500">{t('queued_form_status_pending')}</p>
                          </li>
                      ))}
                  </ul>
              </div>
          ) : null}

        {/* Submitted Forms */}
        {submittedForms.length > 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6 shadow-lg">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {t('submitted_forms_title')}
            </h2>
            <ul className="space-y-4">
              {submittedForms.map((form, index) => (
                <li
                  key={index}
                  className="flex justify-between items-center bg-white border border-gray-300 rounded-lg p-4 shadow-sm"
                >
                  <div>
                    <p className="text-gray-700">
                      <strong>{t('submitted_form_id')}:</strong> {form.formData?.err_id || t('unknown')}
                    </p>
                    <p className="text-gray-700">
                      <strong>{t('submitted_form_date')}:</strong> {form.formData?.date || t('unknown')}
                    </p>
                  </div>
                  <span className="text-green-600 font-medium text-sm">
                    {t('submitted_form_status')}
                  </span>
                </li>
              ))}
            </ul>

            {/* Clear List Button */}
            <button
              onClick={handleClearSubmitted}
              className="mt-6 w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-semibold shadow-lg transition-all"
            >
              {t('clear_list_button')}
            </button>
          </div>
        ) : (
          <p className="text-gray-500 text-center text-sm">{t('no_submitted_forms')}</p>
        )}
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

