import { describe, expect, it } from "vitest";
import { dayHeading, durationLabel, monthGrid, timeRange } from "@/lib/event-time";

describe("event time helpers", () => {
  it("formats durations", () => {
    expect(durationLabel(30)).toBe("30 min");
    expect(durationLabel(60)).toBe("1 h");
    expect(durationLabel(90)).toBe("1 h 30 min");
  });

  it("formats time ranges, marking the next day", () => {
    expect(timeRange(new Date(2026, 10, 25, 14, 0), 90)).toBe("14:00–15:30");
    expect(timeRange(new Date(2026, 10, 25, 23, 0), 120)).toBe("23:00–01:00 (+1)");
  });

  it("names days relative to today", () => {
    const now = new Date(2026, 10, 22, 10);
    expect(dayHeading(new Date(2026, 10, 22, 18), now)).toBe("Today");
    expect(dayHeading(new Date(2026, 10, 23, 9), now)).toBe("Tomorrow");
    expect(dayHeading(new Date(2026, 10, 21, 9), now)).toBe("Yesterday");
    expect(dayHeading(new Date(2026, 10, 25, 9), now)).toBe("Wed 25 Nov");
    expect(dayHeading(new Date(2027, 0, 4, 9), now)).toBe("Mon 4 Jan 2027");
  });

  it("builds a Monday-first month grid", () => {
    const weeks = monthGrid(2026, 10); // November 2026 starts on a Sunday
    expect(weeks[0]!.slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(weeks[0]![6]!.getDate()).toBe(1);
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });
});
