import { beforeEach, describe, expect, it } from 'vitest';
import { getLocalStorageStats } from '../storage';
import { runDraftStorageMaintenance } from '../usePersistentState';

const recentIso = () => new Date().toISOString();
const staleIso = () => new Date(Date.now() - (1000 * 60 * 60 * 24 * 31)).toISOString();

const draftEnvelope = (value: unknown, savedAt: string) => JSON.stringify({ value, savedAt });

describe('draft storage maintenance', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('removes stale, malformed, and unknown draft keys', () => {
    localStorage.setItem('draft:app:orders', draftEnvelope([], recentIso()));
    localStorage.setItem('draft:stock:newIng', draftEnvelope({ name: 'Sugar' }, recentIso()));
    localStorage.setItem('draft:unknown:tmp', draftEnvelope({}, recentIso()));
    localStorage.setItem('draft:app:stale', draftEnvelope({}, staleIso()));
    localStorage.setItem('draft:app:broken-json', '{"broken":');
    localStorage.setItem('draft:app:legacy', JSON.stringify({ value: {} }));

    const removed = runDraftStorageMaintenance(true);

    expect(removed).toBe(4);
    expect(localStorage.getItem('draft:app:orders')).toBeTruthy();
    expect(localStorage.getItem('draft:stock:newIng')).toBeTruthy();
    expect(localStorage.getItem('draft:unknown:tmp')).toBeNull();
    expect(localStorage.getItem('draft:app:stale')).toBeNull();
    expect(localStorage.getItem('draft:app:broken-json')).toBeNull();
    expect(localStorage.getItem('draft:app:legacy')).toBeNull();
  });

  it('reports managed and draft storage stats', () => {
    localStorage.setItem('milena_app_state_v2', JSON.stringify({ version: 2 }));
    localStorage.setItem('draft:app:orders', draftEnvelope([], recentIso()));
    localStorage.setItem('milena_theme', 'dark');
    localStorage.setItem('random_external_key', '123');
    localStorage.setItem('draft:legacy:orphan', draftEnvelope({}, recentIso()));

    const stats = getLocalStorageStats();

    expect(stats.totalKeys).toBe(5);
    expect(stats.managedKeys).toBe(4);
    expect(stats.draftKeys).toBe(2);
    expect(stats.unknownDraftKeys).toBe(1);
    expect(stats.managedBytes).toBeGreaterThan(0);
    expect(stats.totalBytes).toBeGreaterThanOrEqual(stats.managedBytes);
  });
});
