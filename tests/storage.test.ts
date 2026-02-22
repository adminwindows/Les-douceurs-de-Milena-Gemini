import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  APP_STATE_STORAGE_KEY,
  clearAllPersistedData,
  clearDemoBackup,
  clearDemoSession,
  configureStorageEngine,
  loadAppState,
  loadDemoBackup,
  loadDemoSession,
  saveAppState,
  saveDemoBackup,
  saveDemoSession
} from '../storage';
import { INITIAL_INGREDIENTS, INITIAL_PRODUCTS, INITIAL_RECIPES, INITIAL_SETTINGS } from '../utils';
import { createDefaultStorageEngine, StorageEngine } from '../storageEngine';

describe('storage helpers', () => {
  const payload = {
    ingredients: INITIAL_INGREDIENTS,
    recipes: INITIAL_RECIPES,
    products: INITIAL_PRODUCTS,
    settings: INITIAL_SETTINGS,
    orders: [],
    savedReports: [],
    purchases: [],
    productionBatches: []
  };

  beforeEach(() => {
    localStorage.removeItem(APP_STATE_STORAGE_KEY);
    localStorage.removeItem('milena_app_state_v1');
    clearDemoBackup();
    clearDemoSession();
    configureStorageEngine(createDefaultStorageEngine());
  });

  afterEach(() => {
    configureStorageEngine(createDefaultStorageEngine());
  });

  it('round-trips valid app state', () => {
    saveAppState(payload);
    expect(loadAppState()).toEqual(payload);
  });

  it('returns undefined for invalid stored data', () => {
    localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify({ bad: 'data' }));
    expect(loadAppState()).toBeUndefined();
  });

  it('returns undefined for malformed JSON in current storage key', () => {
    localStorage.setItem(APP_STATE_STORAGE_KEY, '{"broken":');
    expect(loadAppState()).toBeUndefined();
  });

  it('falls back to legacy key when current key has invalid envelope', () => {
    localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify({ version: 2, data: { nope: true } }));
    localStorage.setItem('milena_app_state_v1', JSON.stringify(payload));

    const loaded = loadAppState();

    expect(loaded).toEqual(payload);
    expect(localStorage.getItem('milena_app_state_v1')).toBeNull();
  });

  it('migrates legacy v1 app-state key to versioned v2 envelope', () => {
    localStorage.setItem('milena_app_state_v1', JSON.stringify(payload));

    const loaded = loadAppState();

    expect(loaded).toEqual(payload);
    expect(localStorage.getItem('milena_app_state_v1')).toBeNull();

    const currentRaw = localStorage.getItem(APP_STATE_STORAGE_KEY);
    expect(currentRaw).toBeTruthy();
    const current = JSON.parse(currentRaw!);
    expect(current.version).toBe(2);
    expect(current.data).toEqual(payload);
    expect(typeof current.savedAt).toBe('string');
  });

  it('returns undefined for malformed versioned envelope', () => {
    localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify({ version: 2, data: { bad: true } }));

    expect(loadAppState()).toBeUndefined();
  });

  it('does not persist invalid app state payloads', () => {
    saveAppState({ bad: true } as any);
    expect(localStorage.getItem(APP_STATE_STORAGE_KEY)).toBeNull();
  });

  it('round-trips demo backup data', () => {
    saveDemoBackup(payload);
    expect(loadDemoBackup()).toEqual(payload);
    clearDemoBackup();
    expect(loadDemoBackup()).toBeUndefined();
  });

  it('returns undefined for malformed demo backup JSON', () => {
    localStorage.setItem('milena_demo_backup_v1', '{"bad":');
    expect(loadDemoBackup()).toBeUndefined();
  });

  it('round-trips demo session metadata', () => {
    saveDemoSession({ datasetId: 'launch-week' });
    expect(loadDemoSession()).toEqual({ datasetId: 'launch-week' });
    clearDemoSession();
    expect(loadDemoSession()).toBeUndefined();
  });

  it('returns undefined for malformed demo session payloads', () => {
    localStorage.setItem('milena_demo_session_v1', JSON.stringify({ datasetId: 42 }));
    expect(loadDemoSession()).toBeUndefined();

    localStorage.setItem('milena_demo_session_v1', '{"bad":');
    expect(loadDemoSession()).toBeUndefined();
  });

  it('supports injected storage engine for mobile adapters', () => {
    const memory = new Map<string, string>();
    const engine: StorageEngine = {
      getItem: key => memory.get(key) ?? null,
      setItem: (key, value) => memory.set(key, value),
      removeItem: key => memory.delete(key)
    };

    configureStorageEngine(engine);
    saveAppState(payload);

    expect(loadAppState()).toEqual(payload);
    expect(localStorage.getItem(APP_STATE_STORAGE_KEY)).toBeNull();
  });

  it('clears app state, demo keys, and all draft entries', () => {
    saveAppState(payload);
    saveDemoBackup(payload);
    saveDemoSession({ datasetId: 'launch-week' });
    localStorage.setItem('draft:app:orders', JSON.stringify({ value: [], savedAt: '2026-01-01T00:00:00.000Z' }));
    localStorage.setItem('draft:legacy:products', JSON.stringify({ value: [], savedAt: '2026-01-01T00:00:00.000Z' }));
    localStorage.setItem('milena_theme', 'dark');

    clearAllPersistedData();

    expect(loadAppState()).toBeUndefined();
    expect(loadDemoBackup()).toBeUndefined();
    expect(loadDemoSession()).toBeUndefined();
    expect(localStorage.getItem('draft:app:orders')).toBeNull();
    expect(localStorage.getItem('draft:legacy:products')).toBeNull();
    expect(localStorage.getItem('milena_theme')).toBeNull();
  });

  it('clears persisted data with injected storage engine and browser drafts', () => {
    const memory = new Map<string, string>();
    const engine: StorageEngine = {
      getItem: key => memory.get(key) ?? null,
      setItem: (key, value) => memory.set(key, value),
      removeItem: key => memory.delete(key)
    };
    configureStorageEngine(engine);

    saveAppState(payload);
    saveDemoBackup(payload);
    saveDemoSession({ datasetId: 'launch-week' });
    localStorage.setItem('draft:app:settings', JSON.stringify({ value: {}, savedAt: '2026-01-01T00:00:00.000Z' }));

    clearAllPersistedData();

    expect(memory.has(APP_STATE_STORAGE_KEY)).toBe(false);
    expect(memory.has('milena_demo_backup_v1')).toBe(false);
    expect(memory.has('milena_demo_session_v1')).toBe(false);
    expect(localStorage.getItem('draft:app:settings')).toBeNull();
  });
});
