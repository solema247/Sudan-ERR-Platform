// lib/handleOnline.js

// Handles resubmission of offline forms when the user goes online.
import { 
  getSessionQueue, 
  clearSessionQueue, 
  removeFormFromSessionQueue, 
  addFormToSubmittedQueue 
} from './sessionUtils';
import { supabase } from './supabaseClient';

export const handleOnline = async () => {
  console.log('Handling online event: Processing offline forms queue.');

  // Retrieve the session-specific offline queue
  const offlineSessionQueue = getSessionQueue();
  if (!offlineSessionQueue || offlineSessionQueue.length === 0) {
    console.log('No offline forms to process.');
    return;
  }

  const failedSubmissions = []; // Temporary storage for failed submissions

  for (const queuedData of offlineSessionQueue) {
    try {
      console.log('Attempting to submit form:', queuedData);

      // If there's a file, upload it first
      let fileUrl = null;
      if (queuedData.file) {
        const file = await fetch(queuedData.file.objectUrl).then(r => r.blob());
        const fileExt = queuedData.file.name.split('.').pop();
        const fileName = `offline-reports/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('expense-reports')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data } = supabase
          .storage
          .from('expense-reports')
          .getPublicUrl(fileName);

        fileUrl = data.publicUrl;
      }

      const response = await fetch('/api/offline-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...queuedData,
          fileUrl
        }),
      });

      if (!response.ok) {
        console.error('Submission failed with status:', response.status);
        failedSubmissions.push(queuedData);
        continue;
      }

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
        console.error('Submission failed with response:', data.message);
        failedSubmissions.push(queuedData);
      }
    } catch (error) {
      console.error('Error submitting form:', error.message || error);
      failedSubmissions.push(queuedData);
    }
  }

  if (failedSubmissions.length === 0) {
    console.log('All offline forms submitted successfully.');
    clearSessionQueue();
  } else {
    console.warn('Some forms could not be submitted. Retaining in the offline queue.');
    localStorage.setItem('offlineQueue', JSON.stringify(failedSubmissions));
  }
};


