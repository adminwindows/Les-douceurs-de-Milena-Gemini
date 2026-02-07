import { appDataSchema, AppData } from './dataSchema';

const STORAGE_KEY = 'milena_app_state_v1';
const DEMO_BACKUP_KEY = 'milena_demo_backup_v1';
const DEMO_SESSION_KEY = 'milena_demo_session_v1';

export interface DemoSession {
  datasetId: string;
}

export const loadAppState = (): AppData | undefined => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw);
    const result = appDataSchema.safeParse(parsed);
    if (!result.success) {
      return undefined;
    }
    return result.data;
  } catch (error) {
    return undefined;
  }
};

export const saveAppState = (data: AppData): void => {
  const result = appDataSchema.safeParse(data);
  if (!result.success) {
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(result.data));
};

export const loadDemoBackup = (): AppData | undefined => {
  const raw = localStorage.getItem(DEMO_BACKUP_KEY);
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
  localStorage.setItem(DEMO_BACKUP_KEY, JSON.stringify(result.data));
};

export const clearDemoBackup = (): void => {
  localStorage.removeItem(DEMO_BACKUP_KEY);
};

export const loadDemoSession = (): DemoSession | undefined => {
  const raw = localStorage.getItem(DEMO_SESSION_KEY);
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
  localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
};

export const clearDemoSession = (): void => {
  localStorage.removeItem(DEMO_SESSION_KEY);
};
