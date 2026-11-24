import type { BibleVersionId, SabbathSchoolEdition } from '../hooks/usePreferences';
import type { BibleSearchHit, BibleVerse } from './bibleApi';

export type NoteSourceType = 'bible' | 'sabbath-school' | 'hymnal';

export interface StudyNote {
  id: string;
  sourceType: NoteSourceType;
  referenceId: string;
  referenceLabel: string;
  quoteSnippet: string;
  noteText: string;
  createdAt: number;
  updatedAt: number;
}

export interface OfflineBibleChapterRecord {
  key: string; // `${version}:${bookId}:${chapter}`
  version: BibleVersionId;
  bookId: number;
  chapter: number;
  verses: BibleVerse[];
  updatedAt: number;
}

export interface OfflineBibleVersionMeta {
  version: BibleVersionId;
  downloadedAt: number;
  chapterCount: number;
  verseCount: number;
}

export interface SSCacheRecord<T = unknown> {
  key: string;
  quarterlyId?: string;
  data: T;
  updatedAt: number;
}

export interface SabbathSchoolSyncMeta {
  quarterPrefix: string; // e.g. '2026-04'
  syncedQuarterIds: Partial<Record<SabbathSchoolEdition, string>>;
  lessonsCached: number;
  daysCached: number;
  lastSyncedAt: number;
  status: 'ready' | 'partial' | 'error';
  lastError?: string;
}

const DB_NAME = 'sabbath-light-db';
const DB_VERSION = 2;
const REQUIRED_STORES = [
  'notes',
  'bibleChapters',
  'bibleVersions',
  'sabbathSchoolCache',
  'syncMeta',
] as const;

// In-memory fallback used in test environments without IndexedDB
const memStores = {
  notes: new Map<string, StudyNote>(),
  bibleChapters: new Map<string, OfflineBibleChapterRecord>(),
  bibleVersions: new Map<string, OfflineBibleVersionMeta>(),
  sabbathSchoolCache: new Map<string, SSCacheRecord>(),
  syncMeta: new Map<string, { key: string; value: unknown; updatedAt: number }>(),
};

let dbPromise: Promise<IDBDatabase | null> | null = null;

function createMissingStores(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains('notes')) {
    const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
    notesStore.createIndex('sourceType', 'sourceType', { unique: false });
    notesStore.createIndex('referenceId', 'referenceId', { unique: false });
    notesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
  }
  if (!db.objectStoreNames.contains('bibleChapters')) {
    const chStore = db.createObjectStore('bibleChapters', { keyPath: 'key' });
    chStore.createIndex('version', 'version', { unique: false });
  }
  if (!db.objectStoreNames.contains('bibleVersions')) {
    db.createObjectStore('bibleVersions', { keyPath: 'version' });
  }
  if (!db.objectStoreNames.contains('sabbathSchoolCache')) {
    const ssStore = db.createObjectStore('sabbathSchoolCache', { keyPath: 'key' });
    ssStore.createIndex('quarterlyId', 'quarterlyId', { unique: false });
  }
  if (!db.objectStoreNames.contains('syncMeta')) {
    db.createObjectStore('syncMeta', { keyPath: 'key' });
  }
}

function openWithVersion(version?: number): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req =
        typeof version === 'number'
          ? indexedDB.open(DB_NAME, version)
          : indexedDB.open(DB_NAME);
      req.onupgradeneeded = () => createMissingStores(req.result);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    const db = await openWithVersion(DB_VERSION);
    if (!db) return null;

    const missing = REQUIRED_STORES.some((s) => !db.objectStoreNames.contains(s));
    if (!missing) return db;

    const nextVersion = db.version + 1;
    db.close();
    return openWithVersion(nextVersion);
  })();

  return dbPromise;
}

function txPromise<T>(
  storeName: string,
  mode: IDBTransactionMode,
  executor: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    openDb()
      .then((db) => {
        if (!db) {
          reject(new Error('IndexedDB unavailable'));
          return;
        }
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const req = executor(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error(`IDB request failed on ${storeName}`));
      })
      .catch(reject);
  });
}

// --- Notes CRUD ---

export async function getAllNotes(): Promise<StudyNote[]> {
  const db = await openDb();
  if (!db) {
    return Array.from(memStores.notes.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }
  const items = await txPromise<StudyNote[]>('notes', 'readonly', (s) => s.getAll());
  return items.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function putNote(note: StudyNote): Promise<void> {
  const db = await openDb();
  if (!db) {
    memStores.notes.set(note.id, note);
    return;
  }
  await txPromise('notes', 'readwrite', (s) => s.put(note));
}

export async function deleteNoteById(id: string): Promise<void> {
  const db = await openDb();
  if (!db) {
    memStores.notes.delete(id);
    return;
  }
  await txPromise('notes', 'readwrite', (s) => s.delete(id));
}

export async function bulkPutNotes(notes: StudyNote[]): Promise<void> {
  if (notes.length === 0) return;
  const db = await openDb();
  if (!db) {
    for (const n of notes) memStores.notes.set(n.id, n);
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('notes', 'readwrite');
    const store = tx.objectStore('notes');
    for (const n of notes) store.put(n);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Failed importing notes'));
  });
}

// --- Offline Bible Storage ---

export async function getOfflineBibleChapter(
  version: BibleVersionId,
  bookId: number,
  chapter: number,
): Promise<BibleVerse[] | null> {
  const key = `${version}:${bookId}:${chapter}`;
  const db = await openDb();
  if (!db) {
    return memStores.bibleChapters.get(key)?.verses || null;
  }
  const record = await txPromise<OfflineBibleChapterRecord | undefined>('bibleChapters', 'readonly', (s) =>
    s.get(key),
  );
  return record && Array.isArray(record.verses) && record.verses.length > 0 ? record.verses : null;
}

export async function putOfflineBibleChapter(
  version: BibleVersionId,
  bookId: number,
  chapter: number,
  verses: BibleVerse[],
): Promise<void> {
  const record: OfflineBibleChapterRecord = {
    key: `${version}:${bookId}:${chapter}`,
    version,
    bookId,
    chapter,
    verses,
    updatedAt: Date.now(),
  };
  const db = await openDb();
  if (!db) {
    memStores.bibleChapters.set(record.key, record);
    return;
  }
  await txPromise('bibleChapters', 'readwrite', (s) => s.put(record));
}

export async function putBibleChaptersBatch(records: OfflineBibleChapterRecord[]): Promise<void> {
  if (records.length === 0) return;
  const db = await openDb();
  if (!db) {
    for (const rec of records) memStores.bibleChapters.set(rec.key, rec);
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('bibleChapters', 'readwrite');
    const store = tx.objectStore('bibleChapters');
    for (const rec of records) store.put(rec);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Failed writing Bible batch'));
  });
}

export async function getOfflineBibleVersions(): Promise<OfflineBibleVersionMeta[]> {
  const db = await openDb();
  if (!db) {
    return Array.from(memStores.bibleVersions.values());
  }
  return txPromise<OfflineBibleVersionMeta[]>('bibleVersions', 'readonly', (s) => s.getAll());
}

export async function putOfflineBibleVersionMeta(meta: OfflineBibleVersionMeta): Promise<void> {
  const db = await openDb();
  if (!db) {
    memStores.bibleVersions.set(meta.version, meta);
    return;
  }
  await txPromise('bibleVersions', 'readwrite', (s) => s.put(meta));
}

export async function deleteOfflineBibleVersion(version: BibleVersionId): Promise<void> {
  const db = await openDb();
  if (!db) {
    memStores.bibleVersions.delete(version);
    for (const [k, rec] of memStores.bibleChapters.entries()) {
      if (rec.version === version) memStores.bibleChapters.delete(k);
    }
    return;
  }
  await txPromise('bibleVersions', 'readwrite', (s) => s.delete(version));
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('bibleChapters', 'readwrite');
    const store = tx.objectStore('bibleChapters');
    const idx = store.index('version');
    const req = idx.openKeyCursor(IDBKeyRange.only(version));
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Failed removing offline Bible chapters'));
  });
}

export async function searchOfflineBibleVersion(
  version: BibleVersionId,
  query: string,
  bookNames: Map<number, string>,
  limit = 40,
): Promise<BibleSearchHit[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: BibleSearchHit[] = [];
  const db = await openDb();

  if (!db) {
    const matching = Array.from(memStores.bibleChapters.values())
      .filter((r) => r.version === version)
      .sort((a, b) => a.bookId - b.bookId || a.chapter - b.chapter);
    for (const rec of matching) {
      for (const v of rec.verses) {
        if (v.text.toLowerCase().includes(q)) {
          hits.push({
            bookId: rec.bookId,
            bookName: bookNames.get(rec.bookId) || `Book ${rec.bookId}`,
            chapter: rec.chapter,
            verse: v.verse,
            text: v.text,
          });
          if (hits.length >= limit) return hits;
        }
      }
    }
    return hits;
  }

  return new Promise<BibleSearchHit[]>((resolve, reject) => {
    const tx = db.transaction('bibleChapters', 'readonly');
    const store = tx.objectStore('bibleChapters');
    const idx = store.index('version');
    const req = idx.openCursor(IDBKeyRange.only(version));
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) {
        hits.sort((a, b) => a.bookId - b.bookId || a.chapter - b.chapter || a.verse - b.verse);
        resolve(hits.slice(0, limit));
        return;
      }
      const rec = cursor.value as OfflineBibleChapterRecord;
      for (const v of rec.verses) {
        if (v.text.toLowerCase().includes(q)) {
          hits.push({
            bookId: rec.bookId,
            bookName: bookNames.get(rec.bookId) || `Book ${rec.bookId}`,
            chapter: rec.chapter,
            verse: v.verse,
            text: v.text,
          });
        }
      }
      cursor.continue();
    };
    req.onerror = () => reject(req.error || new Error('Offline Bible search failed'));
  });
}

// --- Sabbath School IndexedDB Cache ---

export async function getSSCache<T>(key: string): Promise<T | null> {
  const db = await openDb();
  if (!db) {
    const rec = memStores.sabbathSchoolCache.get(key);
    return rec ? (rec.data as T) : null;
  }
  const rec = await txPromise<SSCacheRecord<T> | undefined>('sabbathSchoolCache', 'readonly', (s) =>
    s.get(key),
  );
  return rec ? rec.data : null;
}

export async function putSSCache<T>(key: string, data: T, quarterlyId?: string): Promise<void> {
  const rec: SSCacheRecord<T> = {
    key,
    quarterlyId,
    data,
    updatedAt: Date.now(),
  };
  const db = await openDb();
  if (!db) {
    memStores.sabbathSchoolCache.set(key, rec);
    return;
  }
  await txPromise('sabbathSchoolCache', 'readwrite', (s) => s.put(rec));
}

// --- Sync Metadata ---

export async function getSyncMeta<T>(key: string): Promise<T | null> {
  const db = await openDb();
  if (!db) {
    const rec = memStores.syncMeta.get(key);
    return rec ? (rec.value as T) : null;
  }
  const rec = await txPromise<{ key: string; value: T; updatedAt: number } | undefined>(
    'syncMeta',
    'readonly',
    (s) => s.get(key),
  );
  return rec ? rec.value : null;
}

export async function putSyncMeta<T>(key: string, value: T): Promise<void> {
  const rec = { key, value, updatedAt: Date.now() };
  const db = await openDb();
  if (!db) {
    memStores.syncMeta.set(key, rec);
    return;
  }
  await txPromise('syncMeta', 'readwrite', (s) => s.put(rec));
}
