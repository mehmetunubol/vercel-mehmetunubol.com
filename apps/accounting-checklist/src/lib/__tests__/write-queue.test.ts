import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWriteQueue, enqueueWrite, flushWrites } from "@/lib/write-queue";

function deferredFetch() {
  const calls: { url: string; body: unknown; resolve: (ok: boolean) => void }[] = [];
  const fetchImpl = vi.fn(
    (url: string, init: RequestInit) =>
      new Promise<{ ok: boolean }>((resolve) => {
        calls.push({ url, body: JSON.parse(String(init.body)), resolve: (ok) => resolve({ ok }) });
      }),
  );
  return { calls, fetchImpl };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("write queue", () => {
  it("debounces rapid edits into a single write", async () => {
    const { calls, fetchImpl } = deferredFetch();
    const q = createWriteQueue<number>();
    enqueueWrite(q, "/a", 1, 700, fetchImpl);
    enqueueWrite(q, "/a", 2, 700, fetchImpl);
    await vi.advanceTimersByTimeAsync(700);
    expect(calls.map((c) => c.body)).toEqual([2]);
  });

  it("flush waits for a write that is already in flight", async () => {
    const { calls, fetchImpl } = deferredFetch();
    const q = createWriteQueue<string>();
    enqueueWrite(q, "/state", "email typed", 700, fetchImpl);
    await vi.advanceTimersByTimeAsync(700); // timer fires; PATCH now in flight
    expect(calls).toHaveLength(1);

    let settled = false;
    const flushed = flushWrites(q, fetchImpl).then((ok) => {
      settled = true;
      return ok;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toBe(false); // must not report "saved" while Drive is still writing

    calls[0]!.resolve(true);
    expect(await flushed).toBe(true);
  });

  it("keeps each write bound to the URL it was made for", async () => {
    const { calls, fetchImpl } = deferredFetch();
    const q = createWriteQueue<string>();
    enqueueWrite(q, "/api/state?checklist=payments", "payments data", 700, fetchImpl);
    // Switch tabs before the timer fires, then edit the other checklist.
    enqueueWrite(q, "/api/state?checklist=report", "report data", 700, fetchImpl);
    await vi.advanceTimersByTimeAsync(0);
    calls[0]?.resolve(true);
    await vi.advanceTimersByTimeAsync(700);
    calls[1]?.resolve(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(calls.map((c) => [c.url, c.body])).toEqual([
      ["/api/state?checklist=payments", "payments data"],
      ["/api/state?checklist=report", "report data"],
    ]);
  });

  it("reports failure when the save fails", async () => {
    const { calls, fetchImpl } = deferredFetch();
    const q = createWriteQueue<number>();
    enqueueWrite(q, "/a", 1, 700, fetchImpl);
    const flushed = flushWrites(q, fetchImpl);
    await vi.advanceTimersByTimeAsync(0);
    calls[0]!.resolve(false);
    expect(await flushed).toBe(false);
  });

  it("resolves immediately when nothing is queued or in flight", async () => {
    expect(await flushWrites(createWriteQueue<number>())).toBe(true);
  });
});
