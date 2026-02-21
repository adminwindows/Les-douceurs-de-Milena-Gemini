import { describe, expect, it, vi } from 'vitest';
import { MobileStorageEngine } from '../mobileStorageEngine';

describe('MobileStorageEngine', () => {
  it('delegates getItem to bridge', () => {
    const bridge = {
      getItem: vi.fn(() => 'value'),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
    const engine = new MobileStorageEngine(bridge);

    expect(engine.getItem('k1')).toBe('value');
    expect(bridge.getItem).toHaveBeenCalledWith('k1');
  });

  it('delegates setItem to bridge', () => {
    const bridge = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
    const engine = new MobileStorageEngine(bridge);

    engine.setItem('k1', 'v1');
    expect(bridge.setItem).toHaveBeenCalledWith('k1', 'v1');
  });

  it('delegates removeItem to bridge', () => {
    const bridge = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
    const engine = new MobileStorageEngine(bridge);

    engine.removeItem('k1');
    expect(bridge.removeItem).toHaveBeenCalledWith('k1');
  });
});
