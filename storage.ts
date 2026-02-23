import { z } from 'zod';
import { appDataSchema, AppData } from './dataSchema';
import { StorageEngine, getStorageEngine, setStorageEngine } from './storageEngine';

export const APP_STATE_STORAGE_KEY = 'milena_app_state_v2';
const LEGACY_APP_STATE_STORAGE_KEYS = ['milena_app_state_v1'] as const;
const CURRENT_APP_STATE_SCHEMA_VERSION = 2;

const DEMO_BACKUP_KEY = 'milena_demo_backup_v1';
const DEMO_SESSION_KEY = 'milena_demo_session_v1';
const DRAFT_STORAGE_KEY_PREFIX = 'draft:';
const THEME_STORAGE_KEY = 'milena_theme';
const MANAGED_STATIC_KEYS = new Set<string>([
  APP_STATE_STORAGE_KEY,
  ...LEGACY_APP_STATE_STORAGE_KEYS,
  DEMO_BACKUP_KEY,
  DEMO_SESSION_KEY,
  THEME_STORAGE_KEY
]);

const versionedAppStateSchema = z.object({
  version: z.number(),
  savedAt: z.string(),
  data: appDataSchema
});

export interface DemoSession {
  datasetId: string;
}

export interface LocalStorageStats {
  totalKeys: number;
  totalBytes: number;
  managedKeys: number;
  managedBytes: number;
  draftKeys: number;
  draftBytes: number;
  unknownDraftKeys: number;
}

const utf8ByteLength = (value: string): number => {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(value).length;
  }
  return value.length * 2;
};

export const configureStorageEngine = (engine: StorageEngine): void => {
  setStorageEngine(engine);
};

const parseAppStateFromUnknown = (value: unknown): AppData | undefined => {
  const versioned = versionedAppStateSchema.safeParse(value);
  if (versioned.success && versioned.data.version === CURRENT_APP_STATE_SCHEMA_VERSION) {
    return versioned.data.data;
  }

  const direct = appDataSchema.safeParse(value);
  if (direct.success) {
    return direct.data;
  }

  return undefined;
};

export const loadAppState = (): AppData | undefined => {
  const engine = getStorageEngine();

  const currentRaw = engine.getItem(APP_STATE_STORAGE_KEY);
  if (currentRaw) {
    try {
      const parsed = parseAppStateFromUnknown(JSON.parse(currentRaw));
      if (parsed) return parsed;
    } catch {
      engine.removeItem(APP_STATE_STORAGE_KEY);
    }
  }

  for (const legacyKey of LEGACY_APP_STATE_STORAGE_KEYS) {
    const legacyRaw = engine.getItem(legacyKey);
    if (!legacyRaw) continue;

    try {
      const parsed = parseAppStateFromUnknown(JSON.parse(legacyRaw));
      if (!parsed) continue;

      saveAppState(parsed);
      engine.removeItem(legacyKey);
      return parsed;
    } catch {
      continue;
    }
  }

  return undefined;
};

export const saveAppState = (data: AppData): void => {
  const result = appDataSchema.safeParse(data);
  if (!result.success) {
    return;
  }

  const envelope = {
    version: CURRENT_APP_STATE_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    data: result.data
  };

  getStorageEngine().setItem(APP_STATE_STORAGE_KEY, JSON.stringify(envelope));
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

export const clearAllPersistedData = (): void => {
  const engine = getStorageEngine();
  const appScopedKeys = [
    APP_STATE_STORAGE_KEY,
    ...LEGACY_APP_STATE_STORAGE_KEYS,
    DEMO_BACKUP_KEY,
    DEMO_SESSION_KEY
  ];

  appScopedKeys.forEach(key => engine.removeItem(key));

  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return;
  }

  const draftKeys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (!key) continue;
    if (key.startsWith(DRAFT_STORAGE_KEY_PREFIX)) {
      draftKeys.push(key);
    }
  }

  draftKeys.forEach(key => window.localStorage.removeItem(key));
  window.localStorage.removeItem(THEME_STORAGE_KEY);
};

export const getLocalStorageStats = (): LocalStorageStats => {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return {
      totalKeys: 0,
      totalBytes: 0,
      managedKeys: 0,
      managedBytes: 0,
      draftKeys: 0,
      draftBytes: 0,
      unknownDraftKeys: 0
    };
  }

  let totalKeys = 0;
  let totalBytes = 0;
  let managedKeys = 0;
  let managedBytes = 0;
  let draftKeys = 0;
  let draftBytes = 0;
  let unknownDraftKeys = 0;

  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (!key) continue;

    totalKeys += 1;
    const value = window.localStorage.getItem(key) ?? '';
    const bytes = utf8ByteLength(key) + utf8ByteLength(value);
    totalBytes += bytes;

    const isDraft = key.startsWith(DRAFT_STORAGE_KEY_PREFIX);
    const isManaged = isDraft || MANAGED_STATIC_KEYS.has(key);
    if (isManaged) {
      managedKeys += 1;
      managedBytes += bytes;
    }

    if (isDraft) {
      draftKeys += 1;
      draftBytes += bytes;
      if (
        !key.startsWith('draft:app:') &&
        !key.startsWith('draft:recipe:') &&
        !key.startsWith('draft:order:') &&
        !key.startsWith('draft:product:') &&
        !key.startsWith('draft:production:') &&
        !key.startsWith('draft:stock:')
      ) {
        unknownDraftKeys += 1;
      }
    }
  }

  return {
    totalKeys,
    totalBytes,
    managedKeys,
    managedBytes,
    draftKeys,
    draftBytes,
    unknownDraftKeys
  };
};
