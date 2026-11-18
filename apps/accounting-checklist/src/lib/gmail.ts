import { google } from "googleapis";
import { Readable } from "node:stream";

export type MailAttachment = {
  filename: string;
  mimeType: string;
  data: Buffer;
};

export type DraftMessage = {
  to?: string;
  subject: string;
  body: string;
  attachments: MailAttachment[];
};

// Header values must never carry CR/LF — otherwise a crafted value (e.g. an
// email typed into a field) could inject extra headers.
function stripNewlines(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function isAscii(value: string): boolean {
  return /^[\x20-\x7e]*$/.test(value);
}

// RFC 2047 caps each encoded-word at 75 chars: "=?UTF-8?B?" + "?=" is 12,
// leaving 63 base64 chars → at most 45 UTF-8 bytes per word (rounded to a
// multiple of 3 so no padding lands mid-text). Chunks split on character
// boundaries so a multi-byte "ş" is never cut in half.
const MAX_ENCODED_WORD_BYTES = 45;

function encodedWords(value: string): string[] {
  const words: string[] = [];
  let chunk = "";
  for (const char of value) {
    if (Buffer.byteLength(chunk + char, "utf8") > MAX_ENCODED_WORD_BYTES) {
      words.push(chunk);
      chunk = "";
    }
    chunk += char;
  }
  if (chunk) words.push(chunk);
  return words.map((w) => `=?UTF-8?B?${Buffer.from(w, "utf8").toString("base64")}?=`);
}

// RFC 2047 encoded-words for non-ASCII header text (Turkish month names,
// "ı/ş/ğ" in file names), folded onto continuation lines so strict clients
// decode them instead of showing raw "=?UTF-8?B?…?=".
export function encodeHeaderValue(value: string): string {
  const clean = stripNewlines(value);
  if (isAscii(clean)) return clean;
  return encodedWords(clean).join("\r\n ");
}

function wrapBase64(data: Buffer): string {
  return (data.toString("base64").match(/.{1,76}/g) ?? []).join("\r\n");
}

function attachmentPart(attachment: MailAttachment): string {
  // Quotes and backslashes would break out of / escape within the quoted
  // parameter value.
  const name = stripNewlines(attachment.filename).replace(/["\\]/g, "'");
  const mimeType = stripNewlines(attachment.mimeType) || "application/octet-stream";
  // ASCII names go in plain. Non-ASCII ones use RFC 2231 `filename*` alone
  // (no lossy ASCII fallback beside it — some parsers prefer the fallback,
  // mangling "şahıs" to "_ah_s"), plus space-separated encoded-words in the
  // legacy Content-Type `name` for older clients.
  const disposition = isAscii(name)
    ? `filename="${name}"`
    : `filename*=UTF-8''${encodeURIComponent(name).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}`;
  const legacyName = isAscii(name) ? name : encodedWords(name).join(" ");
  return [
    `Content-Type: ${mimeType}; name="${legacyName}"`,
    `Content-Disposition: attachment; ${disposition}`,
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(attachment.data),
  ].join("\r\n");
}

export function buildMimeMessage(message: DraftMessage, boundary = `part_${crypto.randomUUID()}`): string {
  const headers = [
    ...(message.to ? [`To: ${stripNewlines(message.to)}`] : []),
    `Subject: ${encodeHeaderValue(message.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
  ];

  const textPart = [
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(Buffer.from(message.body, "utf8")),
  ].join("\r\n");

  const parts = [textPart, ...message.attachments.map(attachmentPart)];

  return [
    ...headers,
    "",
    ...parts.map((part) => `--${boundary}\r\n${part}`),
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

// Why Gmail refused — each maps to a different fix for the user, so they
// must not all collapse into "sign in again".
export type GmailFailure = "scope" | "auth" | "api_disabled" | "rate_limit";

export class GmailDraftError extends Error {
  constructor(
    readonly failure: GmailFailure,
    detail: string,
  ) {
    super(`Gmail draft failed (${failure}): ${detail}`);
  }
}

type GoogleApiError = {
  code?: number | string;
  status?: number;
  message?: string;
  response?: { status?: number; data?: { error?: { message?: string; errors?: { reason?: string }[]; details?: { reason?: string }[] } } };
};

export function classifyGmailError(error: unknown): GmailFailure | null {
  const e = error as GoogleApiError;
  const status = e.response?.status ?? e.status ?? (typeof e.code === "number" ? e.code : undefined);
  const apiError = e.response?.data?.error;
  const reasons = [
    ...(apiError?.errors ?? []).map((x) => x.reason),
    ...(apiError?.details ?? []).map((x) => x.reason),
  ].filter(Boolean) as string[];
  const message = `${apiError?.message ?? ""} ${e.message ?? ""}`.toLowerCase();

  if (status === 401) return "auth";
  if (status === 429 || reasons.some((r) => /ratelimit|quota/i.test(r))) return "rate_limit";
  if (status !== 403) return null;
  if (reasons.some((r) => /accessNotConfigured|SERVICE_DISABLED/i.test(r)) || message.includes("has not been used") || message.includes("is disabled")) {
    return "api_disabled";
  }
  if (reasons.some((r) => /insufficientPermissions|ACCESS_TOKEN_SCOPE_INSUFFICIENT/i.test(r)) || message.includes("insufficient")) {
    return "scope";
  }
  return null;
}

// Uploaded as a raw RFC 822 message via the media endpoint, which accepts
// up to 35 MB — the JSON `raw` field route is far more limited.
export async function createGmailDraft(
  accessToken: string,
  mime: string,
): Promise<{ draftId: string; messageId: string }> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth });

  try {
    const res = await gmail.users.drafts.create({
      userId: "me",
      requestBody: {},
      media: { mimeType: "message/rfc822", body: Readable.from([mime]) },
    });
    const draftId = res.data.id;
    const messageId = res.data.message?.id;
    if (!draftId || !messageId) throw new Error("Gmail did not return a draft id");
    return { draftId, messageId };
  } catch (error) {
    const failure = classifyGmailError(error);
    if (failure) throw new GmailDraftError(failure, (error as Error).message ?? "");
    throw error;
  }
}
