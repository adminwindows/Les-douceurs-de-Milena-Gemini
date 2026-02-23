export type PdfExportResult = 'shared' | 'cancelled' | 'downloaded';

interface SharePayload {
  bytes: Uint8Array;
  fileName: string;
  title: string;
  text: string;
}

const isAbortError = (error: unknown): boolean => {
  if (error instanceof DOMException) {
    return error.name === 'AbortError';
  }
  if (typeof error === 'object' && error !== null && 'name' in error) {
    return (error as { name?: string }).name === 'AbortError';
  }
  return false;
};

const tryNativeShare = async (payload: SharePayload): Promise<'shared' | 'cancelled' | 'unavailable'> => {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function' || typeof File === 'undefined') {
    return 'unavailable';
  }

  const file = new File([payload.bytes], payload.fileName, { type: 'application/pdf' });
  if (typeof navigator.canShare === 'function' && !navigator.canShare({ files: [file] })) {
    return 'unavailable';
  }

  try {
    await navigator.share({
      title: payload.title,
      text: payload.text,
      files: [file]
    });
    return 'shared';
  } catch (error) {
    if (isAbortError(error)) return 'cancelled';
    return 'unavailable';
  }
};

const downloadPdf = (bytes: Uint8Array, fileName: string): void => {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const shareOrDownloadPdf = async (payload: SharePayload): Promise<PdfExportResult> => {
  const shared = await tryNativeShare(payload);
  if (shared === 'shared') return 'shared';
  if (shared === 'cancelled') return 'cancelled';

  downloadPdf(payload.bytes, payload.fileName);
  return 'downloaded';
};
