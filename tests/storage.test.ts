import { describe, expect, it, beforeEach } from 'vitest';
import { loadAppState, saveAppState } from '../storage';
import { INITIAL_INGREDIENTS, INITIAL_PRODUCTS, INITIAL_RECIPES, INITIAL_SETTINGS } from '../utils';

describe('storage helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips valid app state', () => {
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

    saveAppState(payload);
    expect(loadAppState()).toEqual(payload);
  });

  it('returns undefined for invalid stored data', () => {
    localStorage.setItem('milena_app_state_v1', JSON.stringify({ bad: 'data' }));
    expect(loadAppState()).toBeUndefined();
  });
});
