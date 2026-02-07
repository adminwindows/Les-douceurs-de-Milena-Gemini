import { describe, expect, it, beforeEach } from 'vitest';
import {
  clearDemoBackup,
  clearDemoSession,
  loadAppState,
  loadDemoBackup,
  loadDemoSession,
  saveAppState,
  saveDemoBackup,
  saveDemoSession
} from '../storage';
import { INITIAL_INGREDIENTS, INITIAL_PRODUCTS, INITIAL_RECIPES, INITIAL_SETTINGS } from '../utils';

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
  });

  it('round-trips valid app state', () => {
    saveAppState(payload);
    expect(loadAppState()).toEqual(payload);
  });

  it('returns undefined for invalid stored data', () => {
    localStorage.setItem('milena_app_state_v1', JSON.stringify({ bad: 'data' }));
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
});
