/**
 * IndexedDB-backed offline queue for form submissions and file blobs.
 * Replaces the fragile localStorage queue.
 */

const DB_NAME = 'err-offline-db';
const DB_VERSION = 1;
const STORE_QUEUE = 'sessionQueue';
const STORE_SUBMITTED = 'submittedQueue';
const STORE_BLOBS = 'fileBlobs';

export type OfflineQueuedItem = {
  id: string;
  formData: Record<string, any>;
  expenses: any[];
  file?: {
    name: string;
    type: string;
    lastModified: number;
    blobId?: string;
  } | null;
  createdAt: string;
  lastError?: string | null;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SUBMITTED)) {
        db.createObjectStore(STORE_SUBMITTED, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open IndexedDB'));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
  });
}

function notify(type: string, message: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(type, { detail: { message } }));
}

function newId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as T[]) || []);
    req.onerror = () => reject(req.error);
  });
}

/** Migrate leftover localStorage queues into IndexedDB once. */
async function migrateFromLocalStorage(): Promise<void> {
  if (typeof window === 'undefined') return;
  const SESSION_KEY = 'offlineSessionQueue';
  const SUBMITTED_KEY = 'offlineSubmittedQueue';
  try {
    const rawSession = localStorage.getItem(SESSION_KEY);
    const rawSubmitted = localStorage.getItem(SUBMITTED_KEY);
    if (!rawSession && !rawSubmitted) return;

    const session: any[] = rawSession ? JSON.parse(rawSession) : [];
    const submitted: any[] = rawSubmitted ? JSON.parse(rawSubmitted) : [];

    for (const item of session) {
      await addFormToSessionQueue(item, { skipNotify: true });
    }
    for (const item of submitted) {
      await addFormToSubmittedQueue(
        {
          id: item.id || newId(),
          formData: item.formData || item,
          expenses: item.expenses || [],
          file: item.file || null,
          createdAt: item.createdAt || new Date().toISOString(),
        },
        { skipNotify: true }
      );
    }

    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SUBMITTED_KEY);
    localStorage.removeItem('offlineQueue');
  } catch (err) {
    console.warn('Offline queue migration skipped:', err);
  }
}

let migratePromise: Promise<void> | null = null;

export async function ensureOfflineDbReady(): Promise<void> {
  if (!migratePromise) migratePromise = migrateFromLocalStorage();
  await migratePromise;
}

export async function addFormToSessionQueue(
  formPayload: {
    formData: Record<string, any>;
    expenses: any[];
    file?: { name: string; type: string; lastModified: number; objectUrl?: string; blob?: Blob } | File | null;
  },
  opts?: { skipNotify?: boolean }
): Promise<OfflineQueuedItem> {
  await ensureOfflineDbReady();
  const id = newId();
  let fileMeta: OfflineQueuedItem['file'] = null;

  const db = await openDb();

  if (formPayload.file) {
    const blobId = newId();
    let blob: Blob | null = null;
    let name = 'attachment';
    let type = 'application/octet-stream';
    let lastModified = Date.now();

    if (formPayload.file instanceof File) {
      blob = formPayload.file;
      name = formPayload.file.name;
      type = formPayload.file.type;
      lastModified = formPayload.file.lastModified;
    } else if (formPayload.file.blob) {
      blob = formPayload.file.blob;
      name = formPayload.file.name;
      type = formPayload.file.type;
      lastModified = formPayload.file.lastModified;
    } else if (formPayload.file.objectUrl) {
      try {
        const res = await fetch(formPayload.file.objectUrl);
        blob = await res.blob();
        name = formPayload.file.name;
        type = formPayload.file.type;
        lastModified = formPayload.file.lastModified;
      } catch (e) {
        console.warn('Could not persist offline file blob:', e);
      }
    }

    if (blob) {
      const tx = db.transaction(STORE_BLOBS, 'readwrite');
      tx.objectStore(STORE_BLOBS).put({ id: blobId, blob, name, type });
      await txDone(tx);
      fileMeta = { name, type, lastModified, blobId };
    }
  }

  const item: OfflineQueuedItem = {
    id,
    formData: formPayload.formData,
    expenses: formPayload.expenses || [],
    file: fileMeta,
    createdAt: new Date().toISOString(),
    lastError: null,
  };

  const tx = db.transaction(STORE_QUEUE, 'readwrite');
  tx.objectStore(STORE_QUEUE).put(item);
  await txDone(tx);

  if (!opts?.skipNotify) {
    notify('offlineQueueUpdated', 'Form added to the offline queue.');
  }
  return item;
}

export async function addFormToSubmittedQueue(
  item: OfflineQueuedItem,
  opts?: { skipNotify?: boolean }
): Promise<void> {
  await ensureOfflineDbReady();
  const db = await openDb();
  const tx = db.transaction(STORE_SUBMITTED, 'readwrite');
  tx.objectStore(STORE_SUBMITTED).put(item);
  await txDone(tx);
  if (!opts?.skipNotify) {
    notify('submittedQueueUpdated', 'Form added to the submitted queue.');
  }
}

export async function getSessionQueue(): Promise<OfflineQueuedItem[]> {
  await ensureOfflineDbReady();
  const items = await getAll<OfflineQueuedItem>(STORE_QUEUE);
  return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getSubmittedQueue(): Promise<OfflineQueuedItem[]> {
  await ensureOfflineDbReady();
  const items = await getAll<OfflineQueuedItem>(STORE_SUBMITTED);
  return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getQueueCounts(): Promise<{ pending: number; submitted: number; failed: number }> {
  const [pending, submitted] = await Promise.all([getSessionQueue(), getSubmittedQueue()]);
  return {
    pending: pending.length,
    submitted: submitted.length,
    failed: pending.filter((p) => !!p.lastError).length,
  };
}

export async function clearSessionQueue(): Promise<void> {
  await ensureOfflineDbReady();
  const db = await openDb();
  const items = await getSessionQueue();
  const tx = db.transaction([STORE_QUEUE, STORE_BLOBS], 'readwrite');
  for (const item of items) {
    if (item.file?.blobId) tx.objectStore(STORE_BLOBS).delete(item.file.blobId);
    tx.objectStore(STORE_QUEUE).delete(item.id);
  }
  await txDone(tx);
  notify('offlineQueueCleared', 'Offline queue cleared.');
}

export async function clearSubmittedQueue(): Promise<void> {
  await ensureOfflineDbReady();
  const db = await openDb();
  const tx = db.transaction(STORE_SUBMITTED, 'readwrite');
  tx.objectStore(STORE_SUBMITTED).clear();
  await txDone(tx);
  notify('submittedQueueCleared', 'Submitted queue cleared.');
}

export async function removeFormFromSessionQueue(itemOrId: OfflineQueuedItem | string): Promise<void> {
  await ensureOfflineDbReady();
  const id = typeof itemOrId === 'string' ? itemOrId : itemOrId.id;
  const db = await openDb();
  const getTx = db.transaction(STORE_QUEUE, 'readonly');
  const existing: OfflineQueuedItem | undefined = await new Promise((resolve, reject) => {
    const req = getTx.objectStore(STORE_QUEUE).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  const tx = db.transaction([STORE_QUEUE, STORE_BLOBS], 'readwrite');
  if (existing?.file?.blobId) tx.objectStore(STORE_BLOBS).delete(existing.file.blobId);
  tx.objectStore(STORE_QUEUE).delete(id);
  await txDone(tx);
  notify('offlineQueueUpdated', 'Form removed from the offline queue.');
}

export async function markQueueItemError(id: string, error: string): Promise<void> {
  await ensureOfflineDbReady();
  const db = await openDb();
  const item: OfflineQueuedItem | undefined = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readonly');
    const req = tx.objectStore(STORE_QUEUE).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  if (!item) return;
  item.lastError = error;
  const tx = db.transaction(STORE_QUEUE, 'readwrite');
  tx.objectStore(STORE_QUEUE).put(item);
  await txDone(tx);
  notify('offlineQueueUpdated', 'Queue item failed.');
}

export async function getFileBlob(blobId: string): Promise<Blob | null> {
  await ensureOfflineDbReady();
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BLOBS, 'readonly');
    const req = tx.objectStore(STORE_BLOBS).get(blobId);
    req.onsuccess = () => resolve(req.result?.blob || null);
    req.onerror = () => reject(req.error);
  });
}

/** Sync wrappers kept for gradual migration of call sites that expect sync APIs. */
export function getSessionQueueSync(): OfflineQueuedItem[] {
  console.warn('getSessionQueueSync is deprecated; use async getSessionQueue');
  return [];
}
