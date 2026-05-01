// IndexedDB-backed session persistence for batch items.
// Stores source/output blobs so the queue survives page reloads.

const DB_NAME = 'fix-pictures-session';
const DB_VERSION = 1;
const STORE = 'batch-items';

// Minimal shape expected from BatchItem in ImageFixerApp
export interface PersistedBatchItem {
  id: string;
  file: File;
  sourceUrl: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  outputUrl: string | null;
  outputBlob: Blob | null;
  outputName: string | null;
  payload: ({ maskedImageBuffer: ArrayBuffer } & Record<string, unknown>) | null;
  metrics: unknown;
  renderKey: string | null;
  progressLogs: unknown[];
  error: string | null;
  startedAt: number | null;
  completedAt: number | null;
  analysisSnapshot: unknown;
  analysisState: 'idle' | 'loading' | 'ready' | 'error';
  analysisError: string | null;
  inferenceBackend: 'browser-worker' | null;
}

interface StoredRecord {
  id: string;
  fileName: string;
  fileType: string;
  fileBlob: Blob;
  outputBlob: Blob | null;
  outputName: string | null;
  status: string;
  metrics: unknown;
  renderKey: string | null;
  progressLogs: unknown[];
  error: string | null;
  startedAt: number | null;
  completedAt: number | null;
  analysisSnapshot: unknown;
  analysisState: string;
  analysisError: string | null;
  inferenceBackend: string | null;
  payloadMeta: Record<string, unknown> | null;
  payloadBuffer: ArrayBuffer | null;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function persistItems(items: PersistedBatchItem[]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, 'readwrite');
    const store = t.objectStore(STORE);

    store.clear();
    for (const item of items) {
      const { maskedImageBuffer, ...payloadMeta } = item.payload ?? {};
      const record: StoredRecord = {
        id: item.id,
        fileName: item.file.name,
        fileType: item.file.type,
        fileBlob: item.file,
        outputBlob: item.outputBlob,
        outputName: item.outputName,
        // Don't restore mid-flight items as processing
        status: item.status === 'completed' || item.status === 'error' ? item.status : 'queued',
        metrics: item.metrics,
        renderKey: item.renderKey,
        progressLogs: item.status === 'completed' ? item.progressLogs : [],
        error: item.status === 'error' ? item.error : null,
        startedAt: item.startedAt,
        completedAt: item.completedAt,
        analysisSnapshot: item.analysisSnapshot,
        analysisState: item.analysisState === 'ready' ? 'ready' : 'idle',
        analysisError: item.analysisError,
        inferenceBackend: item.inferenceBackend,
        payloadMeta: item.payload ? payloadMeta : null,
        payloadBuffer: maskedImageBuffer ?? null,
      };
      store.put(record);
    }

    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function loadPersistedItems(): Promise<PersistedBatchItem[]> {
  const db = await openDb();
  const records = await new Promise<StoredRecord[]>((resolve, reject) => {
    const t = db.transaction(STORE, 'readonly');
    const req = t.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as StoredRecord[]);
    req.onerror = () => reject(req.error);
  });

  return records.map((r) => {
    const file = new File([r.fileBlob], r.fileName, { type: r.fileType });
    const sourceUrl = URL.createObjectURL(file);
    const outputUrl = r.outputBlob ? URL.createObjectURL(r.outputBlob) : null;
    const payload =
      r.payloadMeta && r.payloadBuffer
        ? ({ ...r.payloadMeta, maskedImageBuffer: r.payloadBuffer } as PersistedBatchItem['payload'])
        : r.payloadMeta
          ? (r.payloadMeta as PersistedBatchItem['payload'])
          : null;

    return {
      id: r.id,
      file,
      sourceUrl,
      status: r.status as PersistedBatchItem['status'],
      outputUrl,
      outputBlob: r.outputBlob,
      outputName: r.outputName,
      payload,
      metrics: r.metrics,
      renderKey: r.renderKey,
      progressLogs: r.progressLogs,
      error: r.error,
      startedAt: r.startedAt,
      completedAt: r.completedAt,
      analysisSnapshot: r.analysisSnapshot,
      analysisState: r.analysisState as PersistedBatchItem['analysisState'],
      analysisError: r.analysisError,
      inferenceBackend: r.inferenceBackend as PersistedBatchItem['inferenceBackend'],
    };
  });
}

export async function clearPersistedItems(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, 'readwrite');
    t.objectStore(STORE).clear();
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function removePersistedItem(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, 'readwrite');
    t.objectStore(STORE).delete(id);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}
