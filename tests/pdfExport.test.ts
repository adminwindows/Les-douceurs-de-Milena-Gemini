import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { shareOrDownloadPdf } from '../pdfExport';

const payload = {
  bytes: new Uint8Array([1, 2, 3]),
  fileName: 'report.pdf',
  title: 'Report',
  text: 'Monthly report'
};

const setNavigatorShare = (shareFn: ((data: ShareData) => Promise<void>) | undefined) => {
  Object.defineProperty(globalThis.navigator, 'share', {
    configurable: true,
    value: shareFn
  });
};

const setNavigatorCanShare = (canShareFn: ((data?: ShareData) => boolean) | undefined) => {
  Object.defineProperty(globalThis.navigator, 'canShare', {
    configurable: true,
    value: canShareFn
  });
};

describe('shareOrDownloadPdf', () => {
  beforeEach(() => {
    if (typeof URL.createObjectURL !== 'function') {
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        writable: true,
        value: () => 'blob:mock'
      });
    }
    if (typeof URL.revokeObjectURL !== 'function') {
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        writable: true,
        value: () => undefined
      });
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setNavigatorShare(undefined);
    setNavigatorCanShare(undefined);
  });

  it('uses native share when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL');

    setNavigatorShare(share as (data: ShareData) => Promise<void>);
    setNavigatorCanShare(canShare);

    const result = await shareOrDownloadPdf(payload);

    expect(result).toBe('shared');
    expect(share).toHaveBeenCalledTimes(1);
    expect(createObjectURLSpy).not.toHaveBeenCalled();
  });

  it('returns cancelled when user aborts native share', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('Cancelled', 'AbortError'));
    const canShare = vi.fn().mockReturnValue(true);
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL');

    setNavigatorShare(share as (data: ShareData) => Promise<void>);
    setNavigatorCanShare(canShare);

    const result = await shareOrDownloadPdf(payload);

    expect(result).toBe('cancelled');
    expect(createObjectURLSpy).not.toHaveBeenCalled();
  });

  it('falls back to download when share is unavailable', async () => {
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    setNavigatorShare(undefined);
    setNavigatorCanShare(undefined);

    const result = await shareOrDownloadPdf(payload);

    expect(result).toBe('downloaded');
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock');
  });
});
