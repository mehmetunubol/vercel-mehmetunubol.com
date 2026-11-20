import { describe, expect, it } from "vitest";
import { dateFromParts, planLabel, planProblem, whenLabel, withDuePlan } from "@/lib/plan";

// Friday 20 Nov 2026, 13:00 local time.
const now = new Date(2026, 10, 20, 13, 0);
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);

describe("whenLabel", () => {
  it("uses relative time for the next few hours today", () => {
    expect(whenLabel(at(20, 13, 30), "exact", now)).toBe("in 30 min");
    expect(whenLabel(at(20, 15), "exact", now)).toBe("in 2 h");
    expect(whenLabel(at(20, 14, 30), "exact", now)).toBe("in 1 h 30 min");
    // A "1 h" plan seen a few seconds later must not read "in 60 min".
    expect(whenLabel(new Date(at(20, 14).getTime() - 5000), "exact", now)).toBe("in 1 h");
    expect(whenLabel(at(20, 14, 57), "exact", now)).toBe("in 1 h 55 min");
  });

  it("uses a clock time later today and on other days", () => {
    expect(whenLabel(at(20, 17), "exact", now)).toBe("at 17:00");
    expect(whenLabel(at(21, 8, 30), "exact", now)).toBe("tomorrow at 08:30");
    expect(whenLabel(at(25, 9), "exact", now)).toBe("Wed 25 Nov at 09:00");
  });

  it("names parts of the day", () => {
    expect(whenLabel(at(20, 18), "evening", now)).toBe("this evening");
    expect(whenLabel(at(21, 9), "morning", now)).toBe("tomorrow morning");
    expect(whenLabel(at(25, 9), "morning", now)).toBe("Wed 25 Nov, morning");
    expect(whenLabel(new Date(2027, 0, 4, 13), "afternoon", now)).toBe("Mon 4 Jan 2027, afternoon");
  });
});

describe("planLabel", () => {
  it("phrases arrivals and departures", () => {
    expect(planLabel("in", at(20, 15), "exact", now)).toBe("Back in 2 h");
    expect(planLabel("out", at(20, 17), "exact", now)).toBe("Leaving at 17:00");
  });
});

describe("dateFromParts", () => {
  it("builds local dates", () => {
    expect(dateFromParts("2026-11-25", "morning")).toEqual(at(25, 9));
    expect(dateFromParts("2026-11-25", "exact", "15:45")).toEqual(at(25, 15, 45));
    expect(dateFromParts("2026-11-25", "exact")).toBeNull();
    expect(dateFromParts("25.11.2026", "morning")).toBeNull();
  });
});

describe("planProblem", () => {
  it("rejects past and far-future times", () => {
    expect(planProblem(at(20, 12), now)).toMatch(/passed/);
    expect(planProblem(new Date(2027, 5, 1), now)).toMatch(/within/);
    expect(planProblem(at(21, 9), now)).toBeNull();
  });
});

describe("withDuePlan", () => {
  const person = {
    presence: "out" as const,
    presenceUpdatedAt: null,
    plannedPresence: "in" as const,
    plannedAt: at(20, 14).toISOString(),
    plannedPrecision: "exact" as const,
  };

  it("flips once the time has come", () => {
    expect(withDuePlan(person, at(20, 13, 59).getTime())).toBe(person);
    const flipped = withDuePlan(person, at(20, 14).getTime());
    expect(flipped.presence).toBe("in");
    expect(flipped.plannedAt).toBeNull();
  });
});
