"use client";

const MAX_SIDE = 1600;
const MAX_BYTES = 1_500_000;

export interface PreparedImage {
  bytes: Uint8Array<ArrayBuffer>;
  mime: "image/jpeg";
  width: number;
  height: number;
}

/**
 * Re-draws the photo onto a canvas and saves it as JPEG. Besides shrinking it,
 * this drops everything the original file carried apart from the pixels:
 * GPS location, camera details, timestamps (EXIF).
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.fillStyle = "#fff"; // transparent PNGs become white, not black
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  for (const quality of [0.82, 0.7, 0.55, 0.4]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) throw new Error("Couldn't encode the photo");
    if (blob.size <= MAX_BYTES || quality === 0.4) {
      return { bytes: new Uint8Array(await blob.arrayBuffer()), mime: "image/jpeg", width, height };
    }
  }
  throw new Error("unreachable");
}
