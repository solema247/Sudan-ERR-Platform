//lib/sessionUtils.js

// Utility functions for managing session-specific offline form queues

const SESSION_QUEUE_KEY = 'offlineSessionQueue';
const SUBMITTED_QUEUE_KEY = 'offlineSubmittedQueue';

// Add a form to the session-specific queue
export const addFormToSessionQueue = (formData) => {
  const sessionQueue = JSON.parse(localStorage.getItem(SESSION_QUEUE_KEY) || '[]');
  sessionQueue.push(formData);
  localStorage.setItem(SESSION_QUEUE_KEY, JSON.stringify(sessionQueue));

  // Dispatch an event to notify that a form has been added to the queue
  window.dispatchEvent(
    new CustomEvent('offlineQueueUpdated', {
      detail: { message: 'Form added to the offline queue.' },
    })
  );
};

// Add a form to the submitted queue
export const addFormToSubmittedQueue = (formData) => {
  const submittedQueue = JSON.parse(localStorage.getItem(SUBMITTED_QUEUE_KEY) || '[]');
  submittedQueue.push(formData);
  localStorage.setItem(SUBMITTED_QUEUE_KEY, JSON.stringify(submittedQueue));

  // Dispatch an event to notify that a form has been added to the submitted queue
  window.dispatchEvent(
    new CustomEvent('submittedQueueUpdated', {
      detail: { message: 'Form added to the submitted queue.' },
    })
  );
};

// Get the session-specific offline queue
export const getSessionQueue = () => {
  return JSON.parse(localStorage.getItem(SESSION_QUEUE_KEY) || '[]');
};

// Get the submitted offline queue
export const getSubmittedQueue = () => {
  return JSON.parse(localStorage.getItem(SUBMITTED_QUEUE_KEY) || '[]');
};

// Clear the session-specific offline queue
export const clearSessionQueue = () => {
  localStorage.removeItem(SESSION_QUEUE_KEY);

  // Dispatch an event to notify that the session queue has been cleared
  window.dispatchEvent(
    new CustomEvent('offlineQueueCleared', {
      detail: { message: 'Offline queue cleared.' },
    })
  );
};

// Clear the submitted offline queue
export const clearSubmittedQueue = () => {
  localStorage.removeItem(SUBMITTED_QUEUE_KEY);

  // Dispatch an event to notify that the submitted queue has been cleared
  window.dispatchEvent(
    new CustomEvent('submittedQueueCleared', {
      detail: { message: 'Submitted queue cleared.' },
    })
  );
};

// Remove a specific form from the session-specific queue
export const removeFormFromSessionQueue = (formData) => {
  const sessionQueue = JSON.parse(localStorage.getItem(SESSION_QUEUE_KEY) || '[]');
  const updatedQueue = sessionQueue.filter((form) => {
    return (
      form.formData.err_id !== formData.formData.err_id ||
      form.formData.date !== formData.formData.date
    );
  });
  localStorage.setItem(SESSION_QUEUE_KEY, JSON.stringify(updatedQueue));

  // Dispatch an event to notify that a form has been removed from the queue
  window.dispatchEvent(
    new CustomEvent('offlineQueueUpdated', {
      detail: { message: 'Form removed from the offline queue.' },
    })
  );
};

// Validate if a form exists in the session-specific queue
export const formExistsInQueue = (formData) => {
  const sessionQueue = JSON.parse(localStorage.getItem(SESSION_QUEUE_KEY) || '[]');
  return sessionQueue.some(
    (form) =>
      form.formData.err_id === formData.formData.err_id &&
      form.formData.date === formData.formData.date
  );
};

