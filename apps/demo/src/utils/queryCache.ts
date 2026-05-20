// IndexedDB-backed semantic cache for AI query results.
// Normalized key → cached result. Zero-latency on repeat queries.

const DB_NAME  = 'local-ghost-cache';
const STORE    = 'queries';
const VERSION  = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess  = () => resolve(req.result);
    req.onerror    = () => reject(req.error);
  });
}

// Stable cache key — lowercase, collapsed whitespace, base64 encoded
export function cacheKey(input: string, schema: string): string {
  const normalized = `${schema}::${input.trim().toLowerCase().replace(/\s+/g, ' ')}`;
  return `lg_${btoa(normalized)}`;
}

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise(resolve => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror   = () => resolve(null);
    });
  } catch { return null; }
}

export async function setCached<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openDB();
    return new Promise(resolve => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror    = () => resolve();
    });
  } catch { /* fail silently — cache is best-effort */ }
}

export async function clearCache(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise(resolve => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror    = () => resolve();
    });
  } catch { /* fail silently */ }
}
