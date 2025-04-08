// lib/handleOnline.js

/**
 * Handles resubmission of offline forms when the user goes online.
 * */

import { 
  getSessionQueue, 
  clearSessionQueue, 
  removeFormFromSessionQueue, 
  addFormToSubmittedQueue 
} from './sessionUtils';
import { uploadImagesAndInsertRecord, ImageCategory } from './uploadImages';
import { supabase } from './supabaseClient';

async function uploadOfflineFormFile(file, errId) {
  try {
    // Upload file to storage
    const filename = `${crypto.randomUUID()}.${file.name.split('.').pop() || 'bin'}`;
    const newPath = `reports/expenses/${filename}`;
    
    const { data: _, error: uploadError } = await supabase
      .storage
      .from('images')
      .upload(newPath, file);

    if (uploadError) throw uploadError;

    // Create record with the offline project ID
    const { error: insertError } = await supabase
      .from('images')
      .insert([
        {
          created_at: new Date().toISOString(),
          filename: filename,
          path: newPath,
          category: ImageCategory[ImageCategory.REPORT_EXPENSES],
          project_id: '514b2d2b-ee38-4f6f-ae35-22c6c982a256',  // Dedicated offline project ID
          notes: `ERR ID: ${errId}`  // Still store ERR ID in notes for reference
        },
      ]);

    if (insertError) throw insertError;

    return {
      success: true,
      filename: filename
    };
  } catch (error) {
    console.error('Error uploading offline form file:', error);
    return {
      success: false,
      errorMessage: 'Failed to upload file'
    };
  }
}

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
        try {
          const response = await fetch(queuedData.file.objectUrl);
          const blobData = await response.blob();
          const file = new File([blobData], queuedData.file.name, {
            type: queuedData.file.type,
            lastModified: queuedData.file.lastModified
          });
          
          const uploadResult = await uploadOfflineFormFile(
            file,
            queuedData.formData.err_id || 'unknown'
          );
          
          if (uploadResult.success) {
            fileUrl = uploadResult.filename;
          } else {
            throw new Error(uploadResult.errorMessage || 'File upload failed');
          }
        } catch (fileError) {
          console.error('Error processing file:', fileError);
          // Continue with form submission even if file upload fails
        }
      }

      const response = await fetch('/api/offline-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...queuedData,
          fileUrl,
          is_offline: true
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