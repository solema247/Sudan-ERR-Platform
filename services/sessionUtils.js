/**
 * Back-compat facade over IndexedDB offline queue.
 * Prefer importing from lib/offline/offlineQueue directly.
 */
export {
  addFormToSessionQueue,
  addFormToSubmittedQueue,
  getSessionQueue,
  getSubmittedQueue,
  clearSessionQueue,
  clearSubmittedQueue,
  removeFormFromSessionQueue,
  getQueueCounts,
  ensureOfflineDbReady,
} from '../lib/offline/offlineQueue';

/** @deprecated Prefer async getSessionQueue */
export const formExistsInQueue = async (formData) => {
  const { getSessionQueue } = await import('../lib/offline/offlineQueue');
  const sessionQueue = await getSessionQueue();
  return sessionQueue.some(
    (form) =>
      form.formData?.err_id === formData.formData?.err_id &&
      form.formData?.date === formData.formData?.date
  );
};
