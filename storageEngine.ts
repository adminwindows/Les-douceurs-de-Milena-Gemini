export interface StorageEngine {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

class BrowserLocalStorageEngine implements StorageEngine {
  getItem(key: string): string | null {
    return localStorage.getItem(key);
  }

  setItem(key: string, value: string): void {
    localStorage.setItem(key, value);
  }

  removeItem(key: string): void {
    localStorage.removeItem(key);
  }
}

class InMemoryStorageEngine implements StorageEngine {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }
}

export const createDefaultStorageEngine = (): StorageEngine => {
  if (typeof localStorage !== 'undefined') {
    return new BrowserLocalStorageEngine();
  }

  return new InMemoryStorageEngine();
};

// Mobile-native engines (Capacitor / React Native) can be injected later
// without changing business logic in App.tsx or storage callers.
let activeStorageEngine: StorageEngine = createDefaultStorageEngine();

export const getStorageEngine = (): StorageEngine => activeStorageEngine;

export const setStorageEngine = (engine: StorageEngine): void => {
  activeStorageEngine = engine;
};
