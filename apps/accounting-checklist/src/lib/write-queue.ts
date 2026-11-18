// A debounced, ordered PATCH queue for one kind of document (state.json or
// defaults.json).
//
// - Debounced so rapid edits (fast typing) collapse into one PATCH instead
//   of a request per keystroke: overlapping requests could race Drive's
//   find-or-create-by-name check and each create a duplicate file.
// - Each pending write carries the URL it was made for, so switching
//   checklists can never send one checklist's data to another's file.
// - Writes are chained, and `flushWrites` waits for any write already in
//   flight, so "flush, then ask the server to read" really reads the latest.

export type WriteQueue<T> = {
  timer: ReturnType<typeof setTimeout> | null;
  pending: { url: string; body: T } | null;
  inFlight: Promise<boolean> | null;
};

type FetchLike = (url: string, init: RequestInit) => Promise<{ ok: boolean }>;

export function createWriteQueue<T>(): WriteQueue<T> {
  return { timer: null, pending: null, inFlight: null };
}

// Sends the queued write now (if any) and resolves once it and every
// earlier write have landed — false if any of them failed.
export function flushWrites<T>(queue: WriteQueue<T>, fetchImpl: FetchLike = fetch): Promise<boolean> {
  if (queue.timer) {
    clearTimeout(queue.timer);
    queue.timer = null;
  }

  const toSend = queue.pending;
  queue.pending = null;
  if (!toSend) return queue.inFlight ?? Promise.resolve(true);

  const previous = queue.inFlight;
  const write = (async () => {
    const previousOk = previous ? await previous : true;
    const response = await fetchImpl(toSend.url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toSend.body),
    }).catch(() => null);
    return previousOk && Boolean(response?.ok);
  })();

  queue.inFlight = write;
  void write.finally(() => {
    if (queue.inFlight === write) queue.inFlight = null;
  });
  return write;
}

export function enqueueWrite<T>(
  queue: WriteQueue<T>,
  url: string,
  body: T,
  delayMs = 700,
  fetchImpl: FetchLike = fetch,
): void {
  // A write still queued for a *different* document goes out first rather
  // than being replaced.
  if (queue.pending && queue.pending.url !== url) void flushWrites(queue, fetchImpl);
  queue.pending = { url, body };
  if (queue.timer) clearTimeout(queue.timer);
  queue.timer = setTimeout(() => {
    void flushWrites(queue, fetchImpl);
  }, delayMs);
}
