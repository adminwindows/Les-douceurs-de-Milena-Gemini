import { AppData, importDataSchema } from './dataSchema';

export interface BackupSelection {
  settings: boolean;
  catalog: boolean;
  operations: boolean;
  reports: boolean;
}

export interface MobileBackupBridge {
  saveTextFile(args: {
    fileName: string;
    contents: string;
    mimeType: string;
  }): Promise<void> | void;
  pickTextFile(args?: {
    mimeTypes?: string[];
  }): Promise<string | null> | string | null;
}

declare global {
  interface Window {
    __MILENA_MOBILE_BACKUP__?: MobileBackupBridge;
  }
}

export const parseImportPayload = (rawValue: string): unknown => {
  const cleaned = rawValue.replace(/^﻿/, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }

    throw new Error('Invalid JSON');
  }
};

export const buildSelectedBackupData = (data: AppData, selection: BackupSelection): Partial<AppData> => {
  const exportData: Partial<AppData> = {};

  if (selection.settings) exportData.settings = data.settings;

  if (selection.catalog) {
    exportData.ingredients = data.ingredients;
    exportData.recipes = data.recipes;
    exportData.products = data.products;
  }

  if (selection.operations) {
    exportData.orders = data.orders;
    exportData.purchases = data.purchases;
    exportData.productionBatches = data.productionBatches;
  }

  if (selection.reports) {
    exportData.savedReports = data.savedReports;
  }

  return exportData;
};

export const buildBackupFilename = (selection: BackupSelection, now = new Date()): string => {
  const date = now.toISOString().slice(0, 10);
  const selectedParts = Object.entries(selection)
    .filter(([, selected]) => selected)
    .map(([key]) => key)
    .join('-') || 'none';

  return `milena_backup_${selectedParts}_${date}.json`;
};

export const getMobileBackupBridge = (): MobileBackupBridge | undefined => {
  if (typeof window === 'undefined') return undefined;

  return window.__MILENA_MOBILE_BACKUP__;
};

export const exportBackupFile = async (data: AppData, selection: BackupSelection): Promise<void> => {
  const exportData = buildSelectedBackupData(data, selection);
  const payload = JSON.stringify(exportData, null, 2);
  const fileName = buildBackupFilename(selection);

  const bridge = getMobileBackupBridge();
  if (bridge) {
    await bridge.saveTextFile({
      fileName,
      contents: payload,
      mimeType: 'application/json'
    });
    return;
  }

  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};

export const parseImportedAppData = (rawValue: string): Partial<AppData> => {
  const parsedJson = parseImportPayload(rawValue);
  const parsed = importDataSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error('Invalid backup schema');
  }

  return parsed.data;
};
