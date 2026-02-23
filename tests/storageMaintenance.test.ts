import { beforeEach, describe, expect, it } from 'vitest';
import { APP_STATE_STORAGE_KEY, clearAllPersistedData, getLocalStorageStats } from '../storage';

describe('storage maintenance stats', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reports total and managed storage usage', () => {
    localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify({ version: 2 }));
    localStorage.setItem('milena_theme', 'dark');
    localStorage.setItem('draft:legacy:orphan', JSON.stringify({ value: [] }));
    localStorage.setItem('external_key', '123');

    const stats = getLocalStorageStats();

    expect(stats.totalKeys).toBe(4);
    expect(stats.managedKeys).toBe(3);
    expect(stats.totalBytes).toBeGreaterThan(0);
    expect(stats.managedBytes).toBeGreaterThan(0);
    expect(stats.totalBytes).toBeGreaterThanOrEqual(stats.managedBytes);
  });

  it('removes legacy draft keys during full reset', () => {
    localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify({ version: 2 }));
    localStorage.setItem('milena_theme', 'dark');
    localStorage.setItem('draft:legacy:orphan', JSON.stringify({ value: [] }));
    localStorage.setItem('external_key', '123');

    clearAllPersistedData();

    expect(localStorage.getItem(APP_STATE_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem('milena_theme')).toBeNull();
    expect(localStorage.getItem('draft:legacy:orphan')).toBeNull();
    expect(localStorage.getItem('external_key')).toBe('123');
  });
});
