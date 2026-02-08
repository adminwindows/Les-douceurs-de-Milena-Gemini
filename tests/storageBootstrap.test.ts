import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { APP_STATE_STORAGE_KEY, configureStorageEngine, loadAppState, saveAppState } from '../storage';
import { createDefaultStorageEngine } from '../storageEngine';
import { configureStorageForCurrentRuntime } from '../storageBootstrap';
import { INITIAL_SETTINGS } from '../utils';

const payload = {
  ingredients: [],
  recipes: [],
  products: [],
  settings: { ...INITIAL_SETTINGS, fixedCostItems: [] },
  orders: [],
  savedReports: [],
  purchases: [],
  productionBatches: []
};

describe('storage runtime bootstrap', () => {
  beforeEach(() => {
    localStorage.clear();
    configureStorageEngine(createDefaultStorageEngine());
    delete window.Capacitor;
    delete window.__MILENA_MOBILE_STORAGE__;
  });

  afterEach(() => {
    configureStorageEngine(createDefaultStorageEngine());
    delete window.Capacitor;
    delete window.__MILENA_MOBILE_STORAGE__;
  });

  it('keeps web default storage when not running on native runtime', () => {
    configureStorageForCurrentRuntime();

    saveAppState(payload);

    expect(localStorage.getItem(APP_STATE_STORAGE_KEY)).toBeTruthy();
    expect(loadAppState()).toEqual(payload);
  });

  it('injects mobile storage engine when native runtime bridge exists', () => {
    const memory = new Map<string, string>();

    window.Capacitor = {
      isNativePlatform: () => true
    };
    window.__MILENA_MOBILE_STORAGE__ = {
      getItem: key => memory.get(key) ?? null,
      setItem: (key, value) => memory.set(key, value),
      removeItem: key => {
        memory.delete(key);
      }
    };

    configureStorageForCurrentRuntime();
    saveAppState(payload);

    expect(memory.get(APP_STATE_STORAGE_KEY)).toBeTruthy();
    expect(localStorage.getItem(APP_STATE_STORAGE_KEY)).toBeNull();
    expect(loadAppState()).toEqual(payload);
  });
});
