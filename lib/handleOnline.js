// lib/handleOnline.js
export const handleOnline = async () => {
  const offlineQueue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
  const newQueue = [];

  for (const queuedData of offlineQueue) {
    try {
      const response = await fetch('/api/offline-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queuedData),
      });
      const data = await response.json();

      if (data.message === 'Form submitted successfully!') {
        console.log('Form submitted successfully:', queuedData);
      } else {
        console.error('Submission failed:', data.message);
        newQueue.push(queuedData);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      newQueue.push(queuedData);
    }
  }

  localStorage.setItem('offlineQueue', JSON.stringify(newQueue));
};
