import { useEffect, useState } from 'react';

export const usePersistentState = <T,>(key: string, initialValue: T) => {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
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
