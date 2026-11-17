import { describe, expect, it } from "vitest";
import { CHECKLISTS, emptyMonthState } from "@/lib/checklist";
import { buildMimeMessage, encodeHeaderValue } from "@/lib/gmail";
import {
  buildReportBody,
  normalizeRecipient,
  planReportEmail,
  turkishMonthLabel,
} from "@/lib/report-email";

describe("turkishMonthLabel", () => {
  it("renders the month in Turkish", () => {
    expect(turkishMonthLabel("2026-11")).toBe("Kasım 2026");
    expect(turkishMonthLabel("2026-08")).toBe("Ağustos 2026");
  });
});

describe("planReportEmail", () => {
  it("collects uploaded files and lists items still missing a document", () => {
    const monthState = {
      ...emptyMonthState(),
      files: [
        { itemIndex: 1, driveFileId: "a", name: "bro.pdf", webViewLink: "https://drive/a" },
        { itemIndex: 3, driveFileId: "b", name: "fiba.pdf", webViewLink: "https://drive/b" },
      ],
    };
    const plan = planReportEmail(CHECKLISTS.report.items, monthState, "2026-11");
    expect(plan.subject).toBe("Kasım 2026 muhasebe evrakları");
    expect(plan.files.map((f) => f.driveFileId)).toEqual(["a", "b"]);
    expect(plan.missing).toHaveLength(6);
    expect(plan.missing).not.toContain("Invoice — Bro");
    // The send step has no document, so it's never "missing".
    expect(plan.missing.some((m) => m.startsWith("Send all"))).toBe(false);
  });
});

describe("buildReportBody", () => {
  it("lists attachments and falls back to Drive links for oversized files", () => {
    const body = buildReportBody(
      "2026-11",
      [{ itemTitle: "Invoice — Bro", name: "bro.pdf" }],
      [{ itemTitle: "Bank", name: "big.pdf", webViewLink: "https://drive/x" }],
    );
    expect(body).toContain("Kasım 2026 ayına ait evraklar ektedir");
    expect(body).toContain("- Invoice — Bro: bro.pdf");
    expect(body).toContain("https://drive/x");
  });
});

describe("normalizeRecipient", () => {
  it("accepts a plain address and rejects anything else", () => {
    expect(normalizeRecipient("  muhasebe@example.com ")).toBe("muhasebe@example.com");
    expect(normalizeRecipient("a@b.com\r\nBcc: evil@x.com")).toBeUndefined();
    expect(normalizeRecipient("not an email")).toBeUndefined();
    expect(normalizeRecipient(undefined)).toBeUndefined();
  });
});

describe("buildMimeMessage", () => {
  it("encodes non-ASCII headers and attaches files as base64", () => {
    const mime = buildMimeMessage(
      {
        to: "muhasebe@example.com",
        subject: "Kasım 2026 muhasebe evrakları",
        body: "Merhaba",
        attachments: [{ filename: "Fiba şahıs.pdf", mimeType: "application/pdf", data: Buffer.from("PDF") }],
      },
      "BOUNDARY",
    );
    expect(mime).toContain("To: muhasebe@example.com");
    expect(mime).toContain(`Subject: ${encodeHeaderValue("Kasım 2026 muhasebe evrakları")}`);
    expect(mime).toContain('boundary="BOUNDARY"');
    expect(mime).toContain(`filename="${encodeHeaderValue("Fiba şahıs.pdf")}"`);
    expect(mime).toContain(Buffer.from("PDF").toString("base64"));
    expect(mime.trimEnd().endsWith("--BOUNDARY--")).toBe(true);
  });

  it("omits the To header when no recipient is set", () => {
    const mime = buildMimeMessage({ subject: "x", body: "y", attachments: [] }, "B");
    expect(mime).not.toMatch(/^To:/m);
  });

  it("strips CR/LF from header values", () => {
    expect(encodeHeaderValue("a\r\nBcc: x")).toBe("a Bcc: x");
  });
});
