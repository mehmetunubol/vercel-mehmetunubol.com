import { describe, expect, it } from "vitest";
import { ChecklistStateStore } from "@/lib/state-store";
import type { MonthState } from "@/lib/checklist";

const file = (itemIndex: number, id: string) => ({
  itemIndex,
  driveFileId: id,
  name: `${id}.pdf`,
  webViewLink: `https://drive/${id}`,
});

const addFile = (f: ReturnType<typeof file>) => (prev: MonthState) => ({ ...prev, files: [...prev.files, f] });

describe("ChecklistStateStore", () => {
  it("keeps both files when two uploads finish one after the other", () => {
    const store = new ChecklistStateStore();
    store.receive("report", { months: {} }, store.version("report"));

    // Both uploads start from the same (empty) view; each completes later.
    store.update("report", "2026-11", addFile(file(1, "bro")));
    const saved = store.update("report", "2026-11", addFile(file(2, "deparsoft")));

    expect(saved?.months["2026-11"]?.files.map((f) => f.driveFileId)).toEqual(["bro", "deparsoft"]);
  });

  it("ignores a fetched copy that is older than local edits", () => {
    const store = new ChecklistStateStore();
    store.receive("payments", { months: {} }, 0);

    const versionAtFetchStart = store.version("payments");
    store.update("payments", "2026-11", (prev) => ({ ...prev, fields: { kiraAmount: "40000" } }));

    // The GET was answered before the PATCH landed: it has no edit.
    const shown = store.receive("payments", { months: {} }, versionAtFetchStart);
    expect(shown.months["2026-11"]?.fields.kiraAmount).toBe("40000");
  });

  it("accepts a fetched copy when nothing changed locally meanwhile", () => {
    const store = new ChecklistStateStore();
    const v = store.version("invoices");
    const fetched = { months: { "2026-11": { items: { "1": true }, fields: {}, files: [], customExpenses: [], creditCards: [], autoFilled: [] } } };
    expect(store.receive("invoices", fetched, v)).toBe(fetched);
  });

  it("applies edits to the checklist they started in, not the one on screen", () => {
    const store = new ChecklistStateStore();
    store.receive("report", { months: {} }, 0);
    store.receive("payments", { months: {} }, 0);
    // Upload started on Report; user switched to Payments before it finished.
    store.update("report", "2026-11", addFile(file(3, "fiba")));
    expect(store.get("report")?.months["2026-11"]?.files).toHaveLength(1);
    expect(store.get("payments")?.months["2026-11"]).toBeUndefined();
  });

  it("refuses edits for a checklist that was never loaded", () => {
    expect(new ChecklistStateStore().update("report", "2026-11", (p) => p)).toBeNull();
  });
});
