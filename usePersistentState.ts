import { useEffect, useState } from 'react';

const DRAFT_KEY_PREFIX = 'draft:';
const DRAFT_STORAGE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const ALLOWED_DRAFT_PREFIXES = [
  'draft:app:',
  'draft:recipe:',
  'draft:order:',
  'draft:product:',
  'draft:production:',
  'draft:stock:'
] as const;

let hasPrunedDraftStorage = false;

interface DraftEnvelope<T> {
  value: T;
  savedAt: string;
}

const isDraftKey = (key: string) => key.startsWith(DRAFT_KEY_PREFIX);
const isAllowedDraftKey = (key: string) => ALLOWED_DRAFT_PREFIXES.some(prefix => key.startsWith(prefix));

const parseDraftEnvelope = <T,>(raw: string): DraftEnvelope<T> | undefined => {
  try {
    const parsed = JSON.parse(raw) as DraftEnvelope<T> | T;
    if (
      parsed &&
      typeof parsed === 'object' &&
      'savedAt' in parsed &&
      'value' in parsed &&
      typeof (parsed as DraftEnvelope<T>).savedAt === 'string'
    ) {
      return parsed as DraftEnvelope<T>;
    }
  } catch {
    return undefined;
  }

  return undefined;
};

export const runDraftStorageMaintenance = (force = false): number => {
  if (typeof window === 'undefined') return 0;
  if (hasPrunedDraftStorage && !force) return 0;
  hasPrunedDraftStorage = true;

  const now = Date.now();
  const keysToRemove: string[] = [];

  for (let i = 0; i < window.localStorage.length; i += 1) {
    const storageKey = window.localStorage.key(i);
    if (!storageKey || !isDraftKey(storageKey)) continue;

    if (!isAllowedDraftKey(storageKey)) {
      keysToRemove.push(storageKey);
      continue;
    }

    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      keysToRemove.push(storageKey);
      continue;
    }

    const envelope = parseDraftEnvelope(raw);
    if (!envelope) {
      keysToRemove.push(storageKey);
      continue;
    }

    const savedAt = Date.parse(envelope.savedAt);
    if (Number.isNaN(savedAt) || now - savedAt > DRAFT_STORAGE_MAX_AGE_MS) {
      keysToRemove.push(storageKey);
    }
  }

  keysToRemove.forEach(storageKey => window.localStorage.removeItem(storageKey));
  return keysToRemove.length;
};

export const usePersistentState = <T,>(key: string, initialValue: T) => {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;

    runDraftStorageMaintenance();

    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return initialValue;

      if (isDraftKey(key)) {
        const envelope = parseDraftEnvelope<T>(raw);
        if (envelope) return envelope.value;
      }

      return JSON.parse(raw) as T;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      if (isDraftKey(key)) {
        const envelope: DraftEnvelope<T> = {
          value: state,
          savedAt: new Date().toISOString()
        };
        window.localStorage.setItem(key, JSON.stringify(envelope));
      } else {
        window.localStorage.setItem(key, JSON.stringify(state));
      }
    } catch {
      // ignore storage errors
    }
  }, [key, state]);

  const reset = () => {
    setState(initialValue);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    }
  };

  return [state, setState, reset] as const;
};
