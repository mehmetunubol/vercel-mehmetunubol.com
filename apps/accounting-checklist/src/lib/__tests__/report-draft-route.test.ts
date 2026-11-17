import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyMonthState } from "@/lib/checklist";

const downloadFile = vi.fn();
const createGmailDraft = vi.fn();
const files = [
  { itemIndex: 1, driveFileId: "ok", name: "Bro faturası.pdf", webViewLink: "https://drive/ok" },
  { itemIndex: 2, driveFileId: "gone", name: "Deparsoft faturası.pdf", webViewLink: "https://drive/gone" },
];

vi.mock("@/lib/auth", () => ({ getDriveAccessToken: vi.fn().mockResolvedValue("token") }));
vi.mock("@/lib/drive", () => ({
  getOrCreateChecklistFolder: vi.fn().mockResolvedValue("folder"),
  readState: vi.fn(async () => ({ months: { "2026-11": { ...emptyMonthState(), files } } })),
  readDefaults: vi.fn(async () => ({ fields: { accountantEmail: "muhasebe@example.com" }, creditCards: {} })),
  downloadFile: (...args: unknown[]) => downloadFile(...args),
}));
vi.mock("@/lib/gmail", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/gmail")>()),
  createGmailDraft: (...args: unknown[]) => createGmailDraft(...args),
}));

const { POST } = await import("@/app/api/report-draft/route");

const call = () =>
  POST(new Request("http://x/api/report-draft", { method: "POST", body: JSON.stringify({ month: "2026-11" }) }) as never);

beforeEach(() => {
  downloadFile.mockReset();
  createGmailDraft.mockReset().mockResolvedValue({ draftId: "d", messageId: "m" });
});

describe("POST /api/report-draft", () => {
  it("leaves unreadable files out and reports them, instead of linking them", async () => {
    downloadFile.mockImplementation(async (_t: string, id: string) => {
      if (id === "gone") throw new Error("404");
      return { kind: "downloaded", mimeType: "application/pdf", size: 3, data: Buffer.from("PDF") };
    });
    const res = await call();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ attachedCount: 1, linkedCount: 0, failed: ["Deparsoft faturası.pdf"] });

    const mime = createGmailDraft.mock.calls[0]![1] as string;
    const text = Buffer.from(mime.split("\r\n\r\n")[2]!.split("\r\n--")[0]!.replace(/\r\n/g, ""), "base64").toString();
    expect(text).toContain("- Fatura — Bro: Bro faturası.pdf");
    expect(text).not.toContain("Deparsoft");
    expect(text).not.toContain("https://drive/gone");
  });

  it("creates no draft when nothing could be read", async () => {
    downloadFile.mockRejectedValue(new Error("401"));
    const res = await call();
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ error: "download_failed" });
    expect(createGmailDraft).not.toHaveBeenCalled();
  });

  it("links (not attaches) files that don't fit", async () => {
    downloadFile.mockResolvedValue({ kind: "too_large", size: 99 });
    const body = await (await call()).json();
    expect(body).toMatchObject({ attachedCount: 0, linkedCount: 2, failed: [] });
  });
});
