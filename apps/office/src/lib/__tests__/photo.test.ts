import { describe, expect, it } from "vitest";
import { decryptPhoto, encodePhotoPayload, encryptPhoto, parseBody, photoAad } from "@/lib/photo";

describe("photo payloads", () => {
  it("round-trips a photo payload and leaves plain text alone", () => {
    const body = encodePhotoPayload({
      kind: "once",
      key: "k",
      mime: "image/jpeg",
      width: 10,
      height: 20,
      caption: "hi",
    });
    expect(parseBody(body)).toEqual({
      type: "photo",
      kind: "once",
      media: "photo",
      duration: 0,
      key: "k",
      mime: "image/jpeg",
      width: 10,
      height: 20,
      caption: "hi",
    });
    expect(parseBody("just text")).toEqual({ type: "text", text: "just text" });
    const clip = encodePhotoPayload({
      kind: "once",
      key: "k",
      mime: "audio/webm",
      width: 0,
      height: 0,
      caption: "",
      media: "audio",
      duration: 3.2,
    });
    expect(parseBody(clip)).toMatchObject({ media: "audio", duration: 3.2 });
    expect(parseBody('{"type":"photo","kind":"once","key":"k"}').type).toBe("text");
  });
});

describe("photo encryption", () => {
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3, 4, 5]);

  it("decrypts with the key and the same message binding", async () => {
    const aad = photoAad("c", "s", "m");
    const enc = await encryptPhoto(bytes, aad);
    expect(enc.ciphertext).not.toContain("/9j/"); // not a readable JPEG
    expect(await decryptPhoto(enc.ciphertext, enc.iv, enc.key, aad)).toEqual(bytes);
  });

  it("fails if the server attaches it to a different message", async () => {
    const enc = await encryptPhoto(bytes, photoAad("c", "s", "m"));
    await expect(
      decryptPhoto(enc.ciphertext, enc.iv, enc.key, photoAad("c", "s", "other")),
    ).rejects.toThrow();
  });
});
