import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  buildBackupFilename,
  buildSelectedBackupData,
  exportBackupFile,
  getMobileBackupBridge,
  parseImportPayload,
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

  it('builds fallback filename when nothing is selected', () => {
    const fileName = buildBackupFilename(
      { settings: false, catalog: false, operations: false, reports: false },
      new Date('2026-01-02T10:00:00.000Z')
    );
    expect(fileName).toBe('milena_backup_none_2026-01-02.json');
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

  it('returns undefined mobile bridge when not provided', () => {
    expect(getMobileBackupBridge()).toBeUndefined();
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

  it('extracts JSON payload from wrapped text', () => {
    const parsed = parseImportPayload('prefix text\n{"settings":{"currency":"EUR"}}\nsuffix');
    expect(parsed).toEqual({ settings: { currency: 'EUR' } });
  });

  it('throws for invalid JSON payload', () => {
    expect(() => parseImportPayload('not-json')).toThrow('Invalid JSON');
  });

  it('parses wrapped JSON payloads and applies schema coercion', () => {
    const imported = parseImportedAppData('prefix text\n{"products":[{"id":1,"name":"P","recipeId":2,"packagingCost":"0","lossRate":"0","unsoldEstimate":"0","packagingUsedOnUnsold":"false","targetMargin":"1","standardPrice":"3.2","estimatedMonthlySales":"1","category":"X"}]}\nsuffix');

    expect(imported.products?.[0].id).toBe('1');
    expect(imported.products?.[0].standardPrice).toBe(3.2);
  });

  it('throws when imported data does not match schema', () => {
    expect(() => parseImportedAppData('{"settings":{"fixedCostItems":"invalid"}}')).toThrow('Invalid backup schema');
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

  it('buildSelectedBackupData includes operations when requested', () => {
    const partial = buildSelectedBackupData(
      {
        ...payload,
        orders: [{ id: 'o1', customerName: 'A', date: '2026-01-01', items: [], tvaRate: 0, status: 'pending' }],
        purchases: [{ id: 'p1', date: '2026-01-01', ingredientId: 'i1', quantity: 1, price: 1 }],
        productionBatches: [{ id: 'b1', date: '2026-01-01', productId: 'x', quantity: 1 }]
      },
      {
        settings: false,
        catalog: false,
        operations: true,
        reports: false
      }
    );

    expect(partial.orders).toHaveLength(1);
    expect(partial.purchases).toHaveLength(1);
    expect(partial.productionBatches).toHaveLength(1);
    expect(partial.products).toBeUndefined();
  });
});
