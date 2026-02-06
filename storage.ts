import { appDataSchema, AppData } from './dataSchema';

const STORAGE_KEY = 'milena_app_state_v1';

export const loadAppState = (): AppData | undefined => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw);
    const result = appDataSchema.safeParse(parsed);
    if (!result.success) {
      return undefined;
    }
    return result.data;
  } catch (error) {
    return undefined;
  }
};

export const saveAppState = (data: AppData): void => {
  const result = appDataSchema.safeParse(data);
  if (!result.success) {
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(result.data));
};
