import { MobileStorageBridge, MobileStorageEngine } from './mobileStorageEngine';
import { configureStorageEngine } from './storage';

interface CapacitorLike {
  isNativePlatform?: () => boolean;
}

declare global {
  interface Window {
    Capacitor?: CapacitorLike;
    __MILENA_MOBILE_STORAGE__?: MobileStorageBridge;
  }
}

export const isNativeRuntime = (): boolean => {
  if (typeof window === 'undefined') return false;
  return Boolean(window.Capacitor?.isNativePlatform?.());
};

export const configureStorageForCurrentRuntime = (): void => {
  if (!isNativeRuntime()) return;

  const bridge = window.__MILENA_MOBILE_STORAGE__;
  if (!bridge) return;

  configureStorageEngine(new MobileStorageEngine(bridge));
};
