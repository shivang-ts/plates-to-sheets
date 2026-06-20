export class ExportCancelledError extends Error {
  constructor() {
    super("Export cancelled");
    this.cancelled = true;
  }
}

export class ExportContext {
  constructor(onProgress) {
    this._cancelled = false;
    this._onProgress = onProgress;
  }

  cancel() {
    this._cancelled = true;
  }

  get cancelled() {
    return this._cancelled;
  }

  checkCancelled() {
    if (this._cancelled) throw new ExportCancelledError();
  }

  report({ phase, current = 0, total = 0, message = "" }) {
    this._onProgress?.({ phase, current, total, message });
  }
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run async work over items with a concurrency limit and optional delay between tasks.
 */
export async function mapWithConcurrency(items, fn, options = {}) {
  const {
    concurrency = 3,
    delayMs = 150,
    ctx = null,
    onProgress = null,
  } = options;

  if (!items.length) return [];

  const results = new Array(items.length);
  let nextIndex = 0;
  let completed = 0;

  async function worker() {
    while (nextIndex < items.length) {
      ctx?.checkCancelled();
      const index = nextIndex;
      nextIndex += 1;
      const item = items[index];

      try {
        results[index] = await fn(item, index);
      } catch (err) {
        if (err?.cancelled) throw err;
        results[index] = null;
      }

      completed += 1;
      onProgress?.(completed, items.length, item);

      if (delayMs > 0 && nextIndex < items.length) {
        await sleep(delayMs);
      }
    }
  }

  const poolSize = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: poolSize }, () => worker()));
  return results;
}
