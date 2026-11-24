"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, X } from "lucide-react";
import { decryptPhoto, photoAad } from "@/lib/photo";

/** Fetches and decrypts a photo; null while loading, "gone" if it can't be had. */
export interface PhotoRef {
  attachmentId: string;
  conversationId: string;
  senderId: string;
  messageId: string;
  photoKey: string;
  mime: string;
}

async function loadPhoto({ attachmentId, conversationId, senderId, messageId, photoKey, mime }: PhotoRef) {
  const response = await fetch(`/api/photos/${attachmentId}`, { cache: "no-store" });
  if (!response.ok) return null;
  const { ciphertext, iv } = (await response.json()) as { ciphertext: string | null; iv: string };
  if (!ciphertext) return null;
  const bytes = await decryptPhoto(ciphertext, iv, photoKey, photoAad(conversationId, senderId, messageId));
  return new Blob([bytes], { type: mime });
}

// Decrypted ordinary photos, kept for the session so scrolling doesn't refetch.
const cache = new Map<string, Promise<string | null>>();

export function PhotoThumb({
  photo,
  width,
  height,
  localUrl,
  onOpen,
}: {
  photo: PhotoRef | null; // null while the sender's copy is still uploading
  width: number;
  height: number;
  localUrl?: string;
  onOpen: (url: string) => void;
}) {
  const attachmentId = photo?.attachmentId ?? null;
  const [url, setUrl] = useState<string | null>(localUrl ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (localUrl || !attachmentId) return;
    let cancelled = false;
    let promise = cache.get(attachmentId);
    if (!promise) {
      promise = loadPhoto(photo!)
        .then((blob) => (blob ? URL.createObjectURL(blob) : null))
        .catch(() => null);
      cache.set(attachmentId, promise);
    }
    void promise.then((value) => {
      if (cancelled) return;
      if (value) setUrl(value);
      else setFailed(true);
    });
    return () => {
      cancelled = true;
    };
    // The photo reference is fixed for a given attachment id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachmentId, localUrl]);

  const ratio = width && height ? `${width} / ${height}` : "4 / 3";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (url) onOpen(url);
      }}
      className="block w-[min(68vw,280px)] overflow-hidden rounded-[0.9rem] bg-[var(--field)]"
      style={{ aspectRatio: ratio, maxHeight: 360 }}
      aria-label="Open photo"
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- decrypted blob URL, not optimisable
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="grid h-full place-items-center text-xs text-[var(--ink-3)]">
          {failed ? "Photo unavailable" : "Loading…"}
        </span>
      )}
    </button>
  );
}

export function PhotoLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-label="Photo"
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- decrypted blob URL */}
      <img src={url} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
      <button
        type="button"
        aria-label="Close"
        className="safe-top absolute top-3 right-3 grid size-10 place-items-center rounded-full bg-white/15 text-white"
      >
        <X size={20} />
      </button>
    </div>
  );
}

const VIEW_SECONDS = 10;

// The single fetch of a one-time photo, shared if the viewer mounts twice
// (React does that in development); dropped when the viewer is closed.
const onceLoads = new Map<string, Promise<Blob | null>>();

function loadOnce(photo: PhotoRef) {
  let promise = onceLoads.get(photo.attachmentId);
  if (!promise) {
    promise = loadPhoto(photo);
    onceLoads.set(photo.attachmentId, promise);
  }
  return promise;
}

/**
 * One-time photo viewer. Opening it fetches the photo (which uses up this
 * person's single view). The picture is drawn on a canvas, so there is no
 * image to long-press and save, and it's only visible while a finger is
 * pressed, for 10 seconds in total. Leaving the app or closing ends it.
 */
export function OnceViewer({ photo, onClose }: { photo: PhotoRef; onClose: (viewed: boolean) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const bitmap = useRef<ImageBitmap | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "gone">("loading");
  const [holding, setHolding] = useState(false);
  const [left, setLeft] = useState(VIEW_SECONDS * 1000);
  const viewed = useRef(false);
  const closeRef = useRef((seen: boolean) => {
    onceLoads.delete(photo.attachmentId);
    onClose(seen);
  });
  useEffect(() => {
    closeRef.current = (seen: boolean) => {
      onceLoads.delete(photo.attachmentId);
      onClose(seen);
    };
  });

  // Load once; free the decoded image when the viewer goes away.
  useEffect(() => {
    let cancelled = false;
    void loadOnce(photo)
      .then(async (blob) => {
        if (cancelled) return;
        if (!blob) return setStatus("gone");
        viewed.current = true;
        bitmap.current = await createImageBitmap(blob);
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("gone"));
    return () => {
      cancelled = true;
      bitmap.current?.close();
      bitmap.current = null;
    };
    // Opening uses up the single view, so this must run exactly once per viewer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Leaving the app (switching apps, control centre, locking) ends the viewing.
  useEffect(() => {
    const end = () => closeRef.current(viewed.current);
    const onVisibility = () => document.visibilityState !== "visible" && end();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", end);
    window.addEventListener("pagehide", end);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", end);
      window.removeEventListener("pagehide", end);
    };
  }, []);

  // Draw while holding; wipe the canvas the moment the finger lifts.
  useEffect(() => {
    const el = canvas.current;
    const image = bitmap.current;
    if (!el || !image) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    if (!holding) {
      ctx.clearRect(0, 0, el.width, el.height);
      el.width = 1;
      el.height = 1;
      return;
    }
    const scale = Math.min(window.innerWidth / image.width, window.innerHeight / image.height);
    el.width = Math.round(image.width * scale * devicePixelRatio);
    el.height = Math.round(image.height * scale * devicePixelRatio);
    el.style.width = `${Math.round(image.width * scale)}px`;
    el.style.height = `${Math.round(image.height * scale)}px`;
    ctx.drawImage(image, 0, 0, el.width, el.height);
  }, [holding, status]);

  // Count down only while held.
  useEffect(() => {
    if (!holding) return;
    const started = Date.now();
    const startLeft = left;
    const timer = setInterval(() => {
      const remaining = startLeft - (Date.now() - started);
      setLeft(Math.max(0, remaining));
      if (remaining <= 0) closeRef.current(true);
    }, 100);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart only when holding changes
  }, [holding]);

  const press = (on: boolean) => status === "ready" && setHolding(on);

  return (
    <div
      role="dialog"
      aria-label="One-time photo"
      className="fixed inset-0 z-50 grid touch-none place-items-center bg-black select-none [-webkit-touch-callout:none]"
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={() => press(true)}
      onPointerUp={() => press(false)}
      onPointerLeave={() => press(false)}
      onPointerCancel={() => press(false)}
    >
      <canvas ref={canvas} className={holding ? "block" : "hidden"} />
      {!holding ? (
        <div className="px-8 text-center text-white">
          {status === "loading" ? <p className="text-sm text-white/70">Opening…</p> : null}
          {status === "gone" ? (
            <p className="text-sm text-white/80">This photo has already been opened, or it&rsquo;s no longer available.</p>
          ) : null}
          {status === "ready" ? (
            <>
              <Eye className="mx-auto mb-3 text-white/80" size={28} />
              <p className="font-semibold">Press and hold to view</p>
              <p className="mt-1 text-sm text-white/60 tabular-nums">
                {Math.ceil(left / 1000)} s left · can&rsquo;t be opened again
              </p>
            </>
          ) : null}
        </div>
      ) : (
        <span className="absolute bottom-6 rounded-full bg-black/50 px-3 py-1 text-xs text-white/80 tabular-nums">
          {Math.ceil(left / 1000)} s
        </span>
      )}
      <button
        type="button"
        aria-label="Close"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          closeRef.current(viewed.current);
        }}
        className="safe-top absolute top-3 right-3 grid size-10 place-items-center rounded-full bg-white/15 text-white"
      >
        <X size={20} />
      </button>
    </div>
  );
}
