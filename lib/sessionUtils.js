//lib/sessionUtils.js

// Utility functions for managing session-specific offline form queues

const SESSION_QUEUE_KEY = 'offlineSessionQueue';
const SUBMITTED_QUEUE_KEY = 'offlineSubmittedQueue';

// Add a form to the session-specific queue
export const addFormToSessionQueue = (formData) => {
  const sessionQueue = JSON.parse(localStorage.getItem(SESSION_QUEUE_KEY) || '[]');
  sessionQueue.push(formData);
  localStorage.setItem(SESSION_QUEUE_KEY, JSON.stringify(sessionQueue));
};

// Add a form to the submitted queue
export const addFormToSubmittedQueue = (formData) => {
  const submittedQueue = JSON.parse(localStorage.getItem(SUBMITTED_QUEUE_KEY) || '[]');
  submittedQueue.push(formData);
  localStorage.setItem(SUBMITTED_QUEUE_KEY, JSON.stringify(submittedQueue));
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
};

// Clear the submitted offline queue
export const clearSubmittedQueue = () => {
  localStorage.removeItem(SUBMITTED_QUEUE_KEY);
};

// Remove a specific form from the session-specific queue
export const removeFormFromSessionQueue = (formData) => {
  const sessionQueue = JSON.parse(localStorage.getItem(SESSION_QUEUE_KEY) || '[]');
  const updatedQueue = sessionQueue.filter((form) => form !== formData);
  localStorage.setItem(SESSION_QUEUE_KEY, JSON.stringify(updatedQueue));
};
