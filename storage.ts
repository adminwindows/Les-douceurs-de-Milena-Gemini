import { appDataSchema, AppData } from './dataSchema';
import { StorageEngine, getStorageEngine, setStorageEngine } from './storageEngine';

const STORAGE_KEY = 'milena_app_state_v1';
const DEMO_BACKUP_KEY = 'milena_demo_backup_v1';
const DEMO_SESSION_KEY = 'milena_demo_session_v1';

export interface DemoSession {
  datasetId: string;
}

export const configureStorageEngine = (engine: StorageEngine): void => {
  setStorageEngine(engine);
};

export const loadAppState = (): AppData | undefined => {
  const raw = getStorageEngine().getItem(STORAGE_KEY);
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw);
    const result = appDataSchema.safeParse(parsed);
    if (!result.success) {
      return undefined;
    }
    return result.data;
  } catch {
    return undefined;
  }
};

export const saveAppState = (data: AppData): void => {
  const result = appDataSchema.safeParse(data);
  if (!result.success) {
    return;
  }
  getStorageEngine().setItem(STORAGE_KEY, JSON.stringify(result.data));
};

export const loadDemoBackup = (): AppData | undefined => {
  const raw = getStorageEngine().getItem(DEMO_BACKUP_KEY);
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw);
    const result = appDataSchema.safeParse(parsed);
    if (!result.success) return undefined;
    return result.data;
  } catch {
    return undefined;
  }
};

export const saveDemoBackup = (data: AppData): void => {
  const result = appDataSchema.safeParse(data);
  if (!result.success) return;
  getStorageEngine().setItem(DEMO_BACKUP_KEY, JSON.stringify(result.data));
};

export const clearDemoBackup = (): void => {
  getStorageEngine().removeItem(DEMO_BACKUP_KEY);
};

export const loadDemoSession = (): DemoSession | undefined => {
  const raw = getStorageEngine().getItem(DEMO_SESSION_KEY);
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw) as DemoSession;
    if (!parsed?.datasetId || typeof parsed.datasetId !== 'string') return undefined;
    return parsed;
  } catch {
    return undefined;
  }
};

export const saveDemoSession = (session: DemoSession): void => {
  getStorageEngine().setItem(DEMO_SESSION_KEY, JSON.stringify(session));
};

export const clearDemoSession = (): void => {
  getStorageEngine().removeItem(DEMO_SESSION_KEY);
};
