/**
 * Sync IndexedDB offline queue when the device comes online.
 */
import {
  getSessionQueue,
  removeFormFromSessionQueue,
  addFormToSubmittedQueue,
  markQueueItemError,
  getFileBlob,
} from '../lib/offline/offlineQueue';
import { newSupabase } from './newSupabaseClient';

const ImageCategory = {
  REPORT_EXPENSES: 'report_expenses',
};

async function uploadOfflineFormFile(file, errId, projectId) {
  try {
    const ext = (file.name && file.name.split('.').pop()) || 'bin';
    const filename = `${crypto.randomUUID()}.${ext}`;
    const newPath = `reports/expenses/${filename}`;

    const { error: uploadError } = await newSupabase.storage
      .from('images')
      .upload(newPath, file);

    if (uploadError) throw uploadError;

    const row = {
      created_at: new Date().toISOString(),
      filename,
      path: newPath,
      category: ImageCategory.REPORT_EXPENSES,
      notes: `ERR ID: ${errId}`,
    };
    if (projectId) row.project_id = projectId;

    const { error: insertError } = await newSupabase.from('images').insert([row]);
    if (insertError) throw insertError;

    return { success: true, filename };
  } catch (error) {
    console.error('Error uploading offline form file:', error);
    return { success: false, errorMessage: 'Failed to upload file' };
  }
}

export const handleOnline = async () => {
  console.log('Handling online event: Processing offline forms queue.');

  let offlineSessionQueue = [];
  try {
    offlineSessionQueue = await getSessionQueue();
  } catch (e) {
    console.error('Could not read offline queue:', e);
    return { synced: 0, failed: 0 };
  }

  if (!offlineSessionQueue.length) {
    console.log('No offline forms to process.');
    return { synced: 0, failed: 0 };
  }

  window.dispatchEvent(
    new CustomEvent('offlineSyncStatus', { detail: { status: 'syncing', pending: offlineSessionQueue.length } })
  );

  let synced = 0;
  let failed = 0;

  for (const queuedData of offlineSessionQueue) {
    try {
      let fileUrl = null;
      if (queuedData.file?.blobId) {
        const blob = await getFileBlob(queuedData.file.blobId);
        if (blob) {
          const file = new File([blob], queuedData.file.name || 'attachment', {
            type: queuedData.file.type || blob.type,
            lastModified: queuedData.file.lastModified || Date.now(),
          });
          const uploadResult = await uploadOfflineFormFile(
            file,
            queuedData.formData?.err_id || 'unknown',
            queuedData.formData?.project_id || null
          );
          if (uploadResult.success) {
            fileUrl = uploadResult.filename;
          } else {
            console.warn('File upload failed; continuing with form submit');
          }
        }
      }

      const response = await fetch('/api/offline-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formData: queuedData.formData,
          expenses: queuedData.expenses,
          fileUrl,
          is_offline: true,
        }),
      });

      if (!response.ok) {
        failed += 1;
        await markQueueItemError(queuedData.id, `HTTP ${response.status}`);
        continue;
      }

      const data = await response.json();
      if (data.message === 'Form submitted successfully!') {
        synced += 1;
        window.dispatchEvent(
          new CustomEvent('offlineFormSubmitted', {
            detail: { message: 'Successfully submitted 1 form(s)' },
          })
        );
        await addFormToSubmittedQueue(queuedData);
        await removeFormFromSessionQueue(queuedData.id);
      } else {
        failed += 1;
        await markQueueItemError(queuedData.id, data.message || 'Submission failed');
      }
    } catch (error) {
      failed += 1;
      console.error('Error submitting form:', error);
      try {
        await markQueueItemError(queuedData.id, error?.message || String(error));
      } catch (_) {}
    }
  }

  window.dispatchEvent(
    new CustomEvent('offlineSyncStatus', {
      detail: { status: failed ? 'partial' : 'idle', synced, failed },
    })
  );

  return { synced, failed };
};
