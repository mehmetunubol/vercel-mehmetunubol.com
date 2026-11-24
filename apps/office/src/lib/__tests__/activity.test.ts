import { describe, expect, it } from "vitest";
import { backoff } from "@/lib/activity";

describe("backoff", () => {
  it("keeps the normal pace while someone is active", () => {
    expect(backoff(5000, 0)).toBe(5000);
    expect(backoff(2500, 90_000)).toBe(2500);
  });

  it("slows down when idle, and more after 5 minutes", () => {
    expect(backoff(5000, 3 * 60_000)).toBe(15_000);
    expect(backoff(5000, 10 * 60_000)).toBe(30_000);
  });

  it("never speeds up a check that is already slow", () => {
    expect(backoff(60_000, 10 * 60_000)).toBe(60_000);
  });
});
