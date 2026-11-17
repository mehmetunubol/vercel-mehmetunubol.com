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

// RFC 2047 encoded-word for non-ASCII header text (Turkish month names,
// "ı/ş/ğ" in file names).
export function encodeHeaderValue(value: string): string {
  const clean = stripNewlines(value);
  if (isAscii(clean)) return clean;
  return `=?UTF-8?B?${Buffer.from(clean, "utf8").toString("base64")}?=`;
}

function wrapBase64(data: Buffer): string {
  return (data.toString("base64").match(/.{1,76}/g) ?? []).join("\r\n");
}

function attachmentPart(attachment: MailAttachment): string {
  // Encoded-word in both name params — what Gmail itself emits, and what
  // mail clients reliably decode (an ASCII fallback beside filename* gets
  // picked by some parsers, mangling "şahıs" to "_ah_s").
  const name = encodeHeaderValue(stripNewlines(attachment.filename).replace(/"/g, "'"));
  return [
    `Content-Type: ${stripNewlines(attachment.mimeType) || "application/octet-stream"}; name="${name}"`,
    `Content-Disposition: attachment; filename="${name}"`,
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

export class GmailScopeError extends Error {
  constructor() {
    super("The signed-in Google session doesn't include the gmail.compose scope");
  }
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
    const status = (error as { code?: number; status?: number }).code ?? (error as { status?: number }).status;
    if (status === 403 || status === 401) throw new GmailScopeError();
    throw error;
  }
}
