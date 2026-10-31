import { DEMO_SESSION_KEY, DEMO_STORAGE_KEY, IS_SUPABASE_MODE } from '@/lib/config';
import { buildSeed } from '@/lib/seed';
import {
  flushRemoteChanges,
  loadRemoteDatabase,
  onAuthStateChange,
  runOverdueSweep,
} from '@/lib/supabaseRepo';
import { hashPassword } from '@/utils/crypto';
import type { Database } from '@/types';

// ---------------------------------------------------------------------------
// Unified data layer
// ---------------------------------------------------------------------------
// Two drivers share the same synchronous API used by the services:
//
//  * demo      - the original browser localStorage store, seeded on first run.
//  * supabase  - a session cache loaded from Postgres. Mutations are diffed
//                against a snapshot and flushed to Supabase in the background.
//
// Keeping the synchronous read API means pages continue to use useLiveQuery
// while persistence moves to Postgres.
// ---------------------------------------------------------------------------

const DB_VERSION = 3;

interface StoredDatabase {
  version: number;
  savedAt: string;
  data: Database;
}

let database: Database | null = null;
let initPromise: Promise<Database> | null = null;
let reloadPromise: Promise<void> | null = null;
let version = 0;
let storageAvailable = true;
let sessionUserId: string | null = null;
let authListenerAttached = false;
let writeQueue: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();
const errorListeners = new Set<(message: string) => void>();

function notifyListeners() {
  version += 1;
  listeners.forEach((listener) => listener());
}

export function subscribeToDb(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDbVersion(): number {
  return version;
}

export function isStorageAvailable(): boolean {
  return storageAvailable;
}

function emitError(message: string) {
  errorListeners.forEach((listener) => listener(message));
}

export function subscribeToDbErrors(listener: (message: string) => void): () => void {
  errorListeners.add(listener);
  return () => errorListeners.delete(listener);
}

function cloneDatabase(source: Database): Database {
  if (typeof structuredClone === 'function') return structuredClone(source);
  return JSON.parse(JSON.stringify(source)) as Database;
}

// ---------------------------------------------------------------------------
// Local demo driver
// ---------------------------------------------------------------------------

function readStored(): Database | null {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDatabase;
    if (!parsed || parsed.version !== DB_VERSION || !parsed.data) return null;
    if (!Array.isArray(parsed.data.profiles) || !Array.isArray(parsed.data.resources)) return null;
    return parsed.data;
  } catch (error) {
    console.warn('[SPACEXCHANGE] Could not read local demo database, reseeding.', error);
    return null;
  }
}

function writeStored(db: Database) {
  if (!storageAvailable || IS_SUPABASE_MODE) return;
  try {
    const payload: StoredDatabase = {
      version: DB_VERSION,
      savedAt: new Date().toISOString(),
      data: db,
    };
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('[SPACEXCHANGE] Local demo storage write failed.', error);
    throw new Error(
      'Local demo storage is full. Remove some report images or reset the demo data from Settings.',
    );
  }
}

async function initDemo(reset: boolean): Promise<Database> {
  try {
    if (typeof localStorage === 'undefined') storageAvailable = false;
  } catch {
    storageAvailable = false;
  }

  if (!reset) {
    const stored = readStored();
    if (stored) {
      database = stored;
      sessionUserId = readDemoSession();
      notifyListeners();
      return stored;
    }
  }

  const [admin, manager, owner, user] = await Promise.all([
    hashPassword('Admin@123'),
    hashPassword('Manager@123'),
    hashPassword('Owner@123'),
    hashPassword('User@123'),
  ]);
  const seeded = await buildSeed({ admin, manager, owner, user });
  database = seeded;
  writeStored(seeded);
  sessionUserId = readDemoSession();
  notifyListeners();
  return seeded;
}

function readDemoSession(): string | null {
  try {
    return localStorage.getItem(DEMO_SESSION_KEY);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Supabase driver
// ---------------------------------------------------------------------------

async function fetchRemote(): Promise<void> {
  const { database: remote, userId } = await loadRemoteDatabase();
  database = remote;
  sessionUserId = userId;
  notifyListeners();
}

export async function refreshRemoteData(): Promise<void> {
  if (!IS_SUPABASE_MODE) return;
  if (reloadPromise) return reloadPromise;
  reloadPromise = (async () => {
    try {
      await fetchRemote();
      if (sessionUserId) {
        const swept = await runOverdueSweep().catch((error) => {
          console.warn('[SPACEXCHANGE] Overdue sweep failed.', error);
          return 0;
        });
        if (swept > 0) await fetchRemote();
      }
    } catch (error) {
      console.error('[SPACEXCHANGE] Could not refresh Supabase data.', error);
      emitError(
        'Could not load the latest data from Supabase. Check your connection and reload the page.',
      );
      throw error;
    } finally {
      reloadPromise = null;
    }
  })();
  return reloadPromise;
}

async function initSupabase(): Promise<Database> {
  await fetchRemote();

  if (!authListenerAttached) {
    authListenerAttached = true;
    onAuthStateChange((event, userId) => {
      if (event === 'INITIAL_SESSION') return;
      sessionUserId = userId;
      if (event === 'SIGNED_OUT') {
        void refreshRemoteData().catch(() => undefined);
        return;
      }
      if (['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) {
        void refreshRemoteData().catch(() => undefined);
      }
    });
  }

  return database as Database;
}

function queueFlush(previous: Database, next: Database) {
  writeQueue = writeQueue.then(async () => {
    try {
      await flushRemoteChanges(previous, next);
    } catch (error) {
      console.error('[SPACEXCHANGE] Supabase write failed, reloading from the server.', error);
      emitError(
        error instanceof Error
          ? `Supabase rejected the change: ${error.message}`
          : 'Supabase rejected the change. The page has been refreshed from the server.',
      );
      await refreshRemoteData().catch(() => undefined);
    }
  });
  return writeQueue;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function initDb(reset = false): Promise<Database> {
  if (reset) {
    database = null;
    initPromise = null;
  }
  if (database) return database;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (IS_SUPABASE_MODE) {
      if (reset) {
        throw new Error('Live Supabase data cannot be reset from the demo settings screen.');
      }
      return initSupabase();
    }
    return initDemo(reset);
  })();

  return initPromise;
}

export function getDb(): Database {
  if (!database) {
    throw new Error('The application database has not been initialised yet.');
  }
  return database;
}

export function persistDb(): void {
  if (IS_SUPABASE_MODE) {
    // Mutations are written by mutateDb. This entry point exists only for the
    // optional client-side overdue sweep, which the Supabase driver performs
    // through an RPC instead.
    return;
  }
  writeStored(getDb());
  notifyListeners();
}

export function mutateDb<T>(mutator: (db: Database) => T): T {
  const db = getDb();

  if (!IS_SUPABASE_MODE) {
    const result = mutator(db);
    writeStored(db);
    notifyListeners();
    return result;
  }

  const previous = cloneDatabase(db);
  const result = mutator(db);
  const next = cloneDatabase(db);
  writeStored(next);
  notifyListeners();
  void queueFlush(previous, next);
  return result;
}

export async function resetDemoDatabase(): Promise<void> {
  if (IS_SUPABASE_MODE) {
    throw new Error(
      'Reset is only available in local demo mode. Supabase data must be managed from the Supabase dashboard or a migration.',
    );
  }
  try {
    localStorage.removeItem(DEMO_STORAGE_KEY);
    localStorage.removeItem(DEMO_SESSION_KEY);
  } catch {
    // ignore
  }
  database = null;
  initPromise = null;
  await initDb(true);
}

export function getSessionUserId(): string | null {
  if (IS_SUPABASE_MODE) return sessionUserId;
  return readDemoSession();
}

export function setSessionUserId(userId: string | null): void {
  if (IS_SUPABASE_MODE) {
    sessionUserId = userId;
    notifyListeners();
    return;
  }
  try {
    if (userId) localStorage.setItem(DEMO_SESSION_KEY, userId);
    else localStorage.removeItem(DEMO_SESSION_KEY);
  } catch {
    // ignore
  }
  notifyListeners();
}

export { IS_SUPABASE_MODE };
