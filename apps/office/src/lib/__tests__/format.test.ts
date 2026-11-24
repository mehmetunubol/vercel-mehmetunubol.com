import { describe, expect, it } from "vitest";
import { onlineLabel } from "@/lib/format";

describe("onlineLabel", () => {
  const now = new Date(2026, 10, 24, 15, 0); // Tue 24 Nov 2026, 15:00

  it("shows online, or the exact last-seen time", () => {
    expect(onlineLabel(true, null, now)).toBe("Online");
    expect(onlineLabel(false, new Date(2026, 10, 24, 14, 5).toISOString(), now)).toBe(
      "Last seen 14:05",
    );
    expect(onlineLabel(false, new Date(2026, 10, 23, 9, 7).toISOString(), now)).toBe(
      "Last seen yesterday 09:07",
    );
    expect(onlineLabel(false, new Date(2026, 10, 20, 18, 30).toISOString(), now)).toBe(
      "Last seen Fri 18:30",
    );
    expect(onlineLabel(false, new Date(2026, 10, 2, 8, 0).toISOString(), now)).toBe(
      "Last seen 2 Nov 08:00",
    );
    expect(onlineLabel(false, null, now)).toBe("Not seen yet");
  });

  it("returns nothing when the status isn't shared", () => {
    expect(onlineLabel(null, null, now)).toBeNull();
  });
});
