import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  APP_STATE_STORAGE_KEY,
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
    localStorage.clear();
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

  it('round-trips demo backup data', () => {
    saveDemoBackup(payload);
    expect(loadDemoBackup()).toEqual(payload);
    clearDemoBackup();
    expect(loadDemoBackup()).toBeUndefined();
  });

  it('round-trips demo session metadata', () => {
    saveDemoSession({ datasetId: 'launch-week' });
    expect(loadDemoSession()).toEqual({ datasetId: 'launch-week' });
    clearDemoSession();
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
});
