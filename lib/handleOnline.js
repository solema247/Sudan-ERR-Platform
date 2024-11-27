// lib/handleOnline.js

// Handles resubmission of offline forms when the user goes online.
import { 
  getSessionQueue, 
  clearSessionQueue, 
  removeFormFromSessionQueue, 
  addFormToSubmittedQueue 
} from './sessionUtils';

export const handleOnline = async () => {
  // Retrieve the session-specific offline queue
  const offlineSessionQueue = getSessionQueue();
  const newQueue = []; // Temporary storage for failed submissions

  for (const queuedData of offlineSessionQueue) {
    try {
      const response = await fetch('/api/offline-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queuedData),
      });

      const data = await response.json();

      if (data.message === 'Form submitted successfully!') {
        console.log('Form submitted successfully:', queuedData);

        // Dispatch a custom event to notify about the successful submission
        window.dispatchEvent(
          new CustomEvent('offlineFormSubmitted', {
            detail: { message: 'Successfully submitted 1 form(s)' },
          })
        );

        // Move the form to the submitted queue
        addFormToSubmittedQueue(queuedData);

        // Remove the form from the session queue
        removeFormFromSessionQueue(queuedData);
      } else {
        console.error('Submission failed:', data.message);
        newQueue.push(queuedData);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      newQueue.push(queuedData);
    }
  }

  // Clear session queue if all submissions succeed
  if (newQueue.length === 0) {
    clearSessionQueue();
  } else {
    localStorage.setItem('offlineQueue', JSON.stringify(newQueue));
  }
};


