import { describe, expect, it, vi, beforeEach } from "vitest";

const filesList = vi.fn();
const filesCreate = vi.fn();
const filesUpdate = vi.fn();
const filesGet = vi.fn();

vi.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: class {
        setCredentials = vi.fn();
      },
    },
    drive: vi.fn().mockImplementation(() => ({
      files: {
        list: filesList,
        create: filesCreate,
        update: filesUpdate,
        get: filesGet,
      },
    })),
  },
}));

const { downloadFile, getOrCreateChecklistFolder, readState, writeState } = await import("@/lib/drive");

beforeEach(() => {
  filesList.mockReset();
  filesCreate.mockReset();
  filesUpdate.mockReset();
  filesGet.mockReset();
});

describe("getOrCreateChecklistFolder", () => {
  it("returns the existing nested folder id when both parent and child exist", async () => {
    filesList
      .mockResolvedValueOnce({ data: { files: [{ id: "parent-id" }] } })
      .mockResolvedValueOnce({ data: { files: [{ id: "child-id" }] } });
    const id = await getOrCreateChecklistFolder("token", "invoices");
    expect(id).toBe("child-id");
    expect(filesCreate).not.toHaveBeenCalled();
  });

  it("creates parent and child folders when neither exist", async () => {
    filesList.mockResolvedValue({ data: { files: [] } });
    filesCreate
      .mockResolvedValueOnce({ data: { id: "parent-id" } })
      .mockResolvedValueOnce({ data: { id: "child-id" } });
    const id = await getOrCreateChecklistFolder("token", "payments");
    expect(id).toBe("child-id");
    expect(filesCreate).toHaveBeenCalledTimes(2);
  });
});

describe("state round-trip", () => {
  it("readState returns EMPTY_STATE when state.json doesn't exist yet", async () => {
    filesList.mockResolvedValue({ data: { files: [] } });
    const state = await readState("token", "root-id");
    expect(state).toEqual({ months: {} });
  });

  it("readState parses an existing state.json", async () => {
    filesList.mockResolvedValue({ data: { files: [{ id: "state-id" }] } });
    filesGet.mockResolvedValue({ data: { months: { "2026-07": { items: { "1": true }, fields: {}, files: [] } } } });
    const state = await readState("token", "root-id");
    expect(state.months["2026-07"]?.items["1"]).toBe(true);
  });

  it("writeState creates state.json when missing", async () => {
    filesList.mockResolvedValue({ data: { files: [] } });
    filesCreate.mockResolvedValue({ data: { id: "state-id" } });
    await writeState("token", "root-id", { months: {} });
    expect(filesCreate).toHaveBeenCalledOnce();
    expect(filesUpdate).not.toHaveBeenCalled();
  });

  it("writeState updates existing state.json", async () => {
    filesList.mockResolvedValue({ data: { files: [{ id: "state-id" }] } });
    await writeState("token", "root-id", { months: {} });
    expect(filesUpdate).toHaveBeenCalledOnce();
    expect(filesCreate).not.toHaveBeenCalled();
  });
});

describe("downloadFile", () => {
  it("skips the media download when metadata says the file won't fit", async () => {
    filesGet.mockResolvedValueOnce({ data: { mimeType: "application/pdf", size: "5000" } });
    const result = await downloadFile("token", "file-id", 1000);
    expect(result).toEqual({ kind: "too_large", size: 5000 });
    expect(filesGet).toHaveBeenCalledTimes(1);
  });

  it("downloads files that fit", async () => {
    filesGet
      .mockResolvedValueOnce({ data: { mimeType: "application/pdf", size: "3" } })
      .mockResolvedValueOnce({ data: new Uint8Array([1, 2, 3]).buffer });
    const result = await downloadFile("token", "file-id", 1000);
    expect(result.kind).toBe("downloaded");
    if (result.kind === "downloaded") {
      expect(result.size).toBe(3);
      expect(result.mimeType).toBe("application/pdf");
    }
  });

  it("re-checks the real size when metadata has none", async () => {
    filesGet
      .mockResolvedValueOnce({ data: { mimeType: "image/heic" } })
      .mockResolvedValueOnce({ data: new Uint8Array(10).buffer });
    expect(await downloadFile("token", "file-id", 5)).toEqual({ kind: "too_large", size: 10 });
  });
});
