import { describe, expect, it } from "vitest";
import { normalizedJobKey } from "../dedupe";

describe("normalizedJobKey", () => {
  it("matches case- and whitespace-insensitively", () => {
    const a = normalizedJobKey("Acme Corp", "Senior TypeScript Engineer", "Istanbul, Türkiye");
    const b = normalizedJobKey("  acme   corp ", "senior typescript engineer", "istanbul,   türkiye");
    expect(a).toBe(b);
  });

  it("treats a missing location the same as an empty string", () => {
    expect(normalizedJobKey("Acme", "Engineer")).toBe(normalizedJobKey("Acme", "Engineer", ""));
  });

  it("differs when title or company differs", () => {
    const base = normalizedJobKey("Acme", "Engineer", "Remote");
    expect(normalizedJobKey("Acme", "Manager", "Remote")).not.toBe(base);
    expect(normalizedJobKey("Globex", "Engineer", "Remote")).not.toBe(base);
  });

  it("simulates cross-run dedupe: a manually-added job blocks a later LinkedIn find of the same posting", () => {
    // Mirrors runSavedSearch()'s logic in index.ts without touching the DB.
    const existingJobsIndex = new Map<string, string>();
    existingJobsIndex.set(normalizedJobKey("Acme Corp", "Senior TypeScript Engineer", "Istanbul"), "manual-job-id");

    const linkedinFind = { company: "Acme Corp", title: "Senior TypeScript Engineer", location: "Istanbul" };
    const key = normalizedJobKey(linkedinFind.company, linkedinFind.title, linkedinFind.location);

    expect(existingJobsIndex.has(key)).toBe(true);

    // A second run against the same saved search shouldn't re-add the
    // LinkedIn posting either, once it's been recorded once.
    existingJobsIndex.set(key, "linkedin-job-id");
    expect(existingJobsIndex.get(key)).toBe("linkedin-job-id");
    const rerun = existingJobsIndex.has(normalizedJobKey("Acme Corp", "Senior TypeScript Engineer", "Istanbul"));
    expect(rerun).toBe(true);
  });
});
