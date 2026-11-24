import { fromBase64, toBase64 } from "@/lib/crypto";

/**
 * Photos in chats. The image is encrypted with its own random AES-256-GCM key;
 * that key (and the photo's details) travel inside the message, which is
 * end-to-end encrypted like any text. The server only stores the photo's
 * ciphertext and never sees the key.
 */

export type PhotoKind = "once" | "normal";
/** What the attachment is. Voice notes and videos are always one-time, up to 5 s. */
export type MediaType = "photo" | "audio" | "video";
export const MAX_CLIP_SECONDS = 5;

export interface PhotoPayload {
  type: "photo";
  kind: PhotoKind;
  media: MediaType;
  duration: number; // seconds, for audio / video
  key: string; // base64 raw AES key for the image bytes
  mime: string;
  width: number;
  height: number;
  caption: string;
}

// Structured message bodies start with this character, which a keyboard can't type.
const PAYLOAD_PREFIX = "\u0001";

export function encodePhotoPayload(
  payload: Omit<PhotoPayload, "type" | "media" | "duration"> &
    Partial<Pick<PhotoPayload, "media" | "duration">>,
) {
  return PAYLOAD_PREFIX + JSON.stringify({ type: "photo", ...payload });
}

export type ParsedBody = { type: "text"; text: string } | PhotoPayload;

export function parseBody(plaintext: string): ParsedBody {
  if (plaintext.startsWith(PAYLOAD_PREFIX)) {
    try {
      const value = JSON.parse(plaintext.slice(1)) as Partial<PhotoPayload>;
      if (
        value.type === "photo" &&
        (value.kind === "once" || value.kind === "normal") &&
        typeof value.key === "string"
      ) {
        return {
          type: "photo",
          kind: value.kind,
          media: value.media === "audio" || value.media === "video" ? value.media : "photo",
          duration: Number(value.duration) || 0,
          key: value.key,
          mime: typeof value.mime === "string" ? value.mime : "image/jpeg",
          width: Number(value.width) || 0,
          height: Number(value.height) || 0,
          caption: typeof value.caption === "string" ? value.caption : "",
        };
      }
    } catch {
      // fall through: show as text
    }
  }
  return { type: "text", text: plaintext };
}

export function photoAad(conversationId: string, senderId: string, messageId: string) {
  return new TextEncoder().encode(`${conversationId}|${senderId}|${messageId}|photo`);
}

const subtle = globalThis.crypto.subtle;

export async function encryptPhoto(bytes: Uint8Array<ArrayBuffer>, aad: Uint8Array<ArrayBuffer>) {
  const key = await subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await subtle.encrypt({ name: "AES-GCM", iv, additionalData: aad }, key, bytes);
  return {
    key: toBase64(await subtle.exportKey("raw", key)),
    iv: toBase64(iv),
    ciphertext: toBase64(ciphertext),
  };
}

export async function decryptPhoto(
  ciphertext: string,
  iv: string,
  key: string,
  aad: Uint8Array<ArrayBuffer>,
): Promise<Uint8Array<ArrayBuffer>> {
  const cryptoKey = await subtle.importKey("raw", fromBase64(key), "AES-GCM", false, ["decrypt"]);
  return new Uint8Array(
    await subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(iv), additionalData: aad },
      cryptoKey,
      fromBase64(ciphertext),
    ),
  );
}
