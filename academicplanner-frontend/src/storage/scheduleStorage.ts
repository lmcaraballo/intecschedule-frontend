import { z } from 'zod';
import { academicSessionSchema, type AcademicSession } from '../types/academic';
import { defaultPreferences, preferencesSchema, type Preferences } from '../features/preferences/preferences';

export const ACADEMIC_STORAGE_KEY = 'academicplanner:data:v1';
const STORAGE_KEY = ACADEMIC_STORAGE_KEY;
const storedDataSchema = z.object({
  version: z.literal(1),
  session: academicSessionSchema.nullable(),
  preferences: preferencesSchema,
});

export type StoredData = z.infer<typeof storedDataSchema>;
export type StorageReadResult = {
  status: 'ready' | 'empty' | 'corrupt' | 'unavailable';
  data: StoredData | null;
};
type StorageChange = 'updated' | 'cleared';
const listeners = new Set<(change: StorageChange) => void>();

function emit(change: StorageChange) {
  listeners.forEach((listener) => listener(change));
}

function subscribe(listener: (change: StorageChange) => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      listener(event.newValue === null ? 'cleared' : 'updated');
    }
  };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(listener); window.removeEventListener('storage', onStorage); };
}

export class ScheduleStorageError extends Error {
  constructor() {
    super('No pudimos guardar los datos en este dispositivo. Revisa el espacio o los permisos de almacenamiento e inténtalo de nuevo.');
    this.name = 'ScheduleStorageError';
  }
}

function read(): StorageReadResult {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return { status: 'empty', data: null };
    let parsed: unknown;
    try { parsed = JSON.parse(raw) as unknown; }
    catch { return { status: 'corrupt', data: null }; }
    const result = storedDataSchema.safeParse(parsed);
    return result.success ? { status: 'ready', data: result.data } : { status: 'corrupt', data: null };
  } catch {
    return { status: 'unavailable', data: null };
  }
}

function get(): StoredData | null { return read().data; }

function write(data: StoredData): StoredData {
  // Parsing projects an allowlist at every depth; credentials and extra backend
  // fields never reach JSON serialization, even when supplied at runtime.
  const safeData = storedDataSchema.parse(data);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safeData));
  } catch {
    throw new ScheduleStorageError();
  }
  emit('updated');
  return safeData;
}

function save(session: AcademicSession): StoredData {
  return write({
    version: 1,
    session,
    preferences: get()?.preferences ?? defaultPreferences,
  });
}

function savePreferences(preferences: Preferences): StoredData {
  const previous = read();
  // A theme change must not overwrite unreadable or temporarily inaccessible data.
  if (previous.status === 'corrupt' || previous.status === 'unavailable') throw new ScheduleStorageError();
  return write({ version: 1, session: previous.data?.session ?? null, preferences });
}

function clear(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    throw new ScheduleStorageError();
  }
  emit('cleared');
}

// Only our versioned app key is removed. Other apps and static PWA caches remain.
export function clearAcademicPlannerData(): void { clear(); }

export const scheduleStorage = { save, get, read, clear, savePreferences, subscribe };
