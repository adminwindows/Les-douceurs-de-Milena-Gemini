import { StorageEngine } from './storageEngine';

export interface MobileStorageBridge {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class MobileStorageEngine implements StorageEngine {
  constructor(private readonly bridge: MobileStorageBridge) {}

  getItem(key: string): string | null {
    return this.bridge.getItem(key);
  }

  setItem(key: string, value: string): void {
    this.bridge.setItem(key, value);
  }

  removeItem(key: string): void {
    this.bridge.removeItem(key);
  }
}
