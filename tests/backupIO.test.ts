import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  buildBackupFilename,
  buildSelectedBackupData,
  exportBackupFile,
  parseImportedAppData,
  type BackupSelection
} from '../backupIO';
import { INITIAL_SETTINGS } from '../utils';
import type { AppData } from '../dataSchema';

const selection: BackupSelection = {
  settings: true,
  catalog: true,
  operations: false,
  reports: true
};

const payload: AppData = {
  ingredients: [],
  recipes: [],
  products: [],
  settings: { ...INITIAL_SETTINGS, fixedCostItems: [] },
  orders: [],
  savedReports: [],
  purchases: [],
  productionBatches: []
};

describe('backup I/O', () => {
  beforeEach(() => {
    delete window.__MILENA_MOBILE_BACKUP__;
  });

  afterEach(() => {
    delete window.__MILENA_MOBILE_BACKUP__;
    vi.restoreAllMocks();
  });

  it('builds backup file names from selected sections', () => {
    const fileName = buildBackupFilename(selection, new Date('2026-01-02T10:00:00.000Z'));
    expect(fileName).toBe('milena_backup_settings-catalog-reports_2026-01-02.json');
  });

  it('exports selected backup payload with browser fallback', async () => {
    const click = vi.fn();
    const anchor = { click, href: '', download: '' } as unknown as HTMLAnchorElement;

    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn(() => 'blob:test-url'),
      configurable: true
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: vi.fn(),
      configurable: true
    });

    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(anchor as never);
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');

    await exportBackupFile(payload, selection);

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(createObjectURLSpy).toHaveBeenCalledOnce();
    expect(anchor.download).toMatch(/^milena_backup_settings-catalog-reports_\d{4}-\d{2}-\d{2}\.json$/);
    expect(anchor.href).toBe('blob:test-url');
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:test-url');
  });

  it('uses native backup bridge for export and import when available', async () => {
    const saveTextFile = vi.fn();
    const pickTextFile = vi.fn().mockResolvedValue('{"settings":{"currency":"EUR"}}');

    window.__MILENA_MOBILE_BACKUP__ = {
      saveTextFile,
      pickTextFile
    };

    await exportBackupFile(payload, selection);
    expect(saveTextFile).toHaveBeenCalledOnce();

    const imported = parseImportedAppData(await pickTextFile());
    expect(imported.settings?.currency).toBe('EUR');
  });

  it('parses wrapped JSON payloads and applies schema coercion', () => {
    const imported = parseImportedAppData('prefix text\n{"products":[{"id":1,"name":"P","recipeId":2,"laborTimeMinutes":"1","packagingCost":"0","lossRate":"0","unsoldEstimate":"0","packagingUsedOnUnsold":"false","targetMargin":"1","estimatedMonthlySales":"1","category":"X","tvaRate":"5.5"}]}\nsuffix');

    expect(imported.products?.[0].id).toBe('1');
    expect(imported.products?.[0].tvaRate).toBe(5.5);
  });

  it('buildSelectedBackupData only includes requested sections', () => {
    const partial = buildSelectedBackupData(payload, {
      settings: false,
      catalog: true,
      operations: false,
      reports: false
    });

    expect(partial.settings).toBeUndefined();
    expect(partial.ingredients).toEqual([]);
    expect(partial.orders).toBeUndefined();
  });
});
