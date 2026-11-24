"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, Mic, Video, X } from "lucide-react";
import { decryptPhoto, type MediaType, photoAad } from "@/lib/photo";
import { useI18n } from "@/components/i18n-provider";

/** Fetches and decrypts a photo; null while loading, "gone" if it can't be had. */
export interface PhotoRef {
  attachmentId: string;
  conversationId: string;
  senderId: string;
  messageId: string;
  photoKey: string;
  mime: string;
  media: MediaType;
}

async function loadPhoto({
  attachmentId,
  conversationId,
  senderId,
  messageId,
  photoKey,
  mime,
}: PhotoRef) {
  const response = await fetch(`/api/photos/${attachmentId}`, { cache: "no-store" });
  if (!response.ok) return null;
  const { ciphertext, iv } = (await response.json()) as { ciphertext: string | null; iv: string };
  if (!ciphertext) return null;
  const bytes = await decryptPhoto(
    ciphertext,
    iv,
    photoKey,
    photoAad(conversationId, senderId, messageId),
  );
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
  const { t } = useI18n();
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
      aria-label={t("Open photo")}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- decrypted blob URL, not optimisable
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="grid h-full place-items-center text-xs text-[var(--ink-3)]">
          {failed ? t("Photo unavailable") : t("Loading…")}
        </span>
      )}
    </button>
  );
}

export function PhotoLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <div
      role="dialog"
      aria-label={t("Photo")}
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- decrypted blob URL */}
      <img src={url} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
      <button
        type="button"
        aria-label={t("Close")}
        className="safe-top absolute top-3 right-3 grid size-10 place-items-center rounded-full bg-white/15 text-white"
      >
        <X size={20} />
      </button>
    </div>
  );
}

// Total time a one-time photo can be looked at (and the longest clip).
const VIEW_SECONDS = 5;

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
 * One-time photo / voice note / video viewer. Opening it fetches the item
 * (which uses up this person's single view). It's only shown or played while
 * a finger is pressed, for 5 seconds in total; a clip also closes when it
 * ends. Photos are drawn on a canvas, so there's no image to long-press and
 * save. Leaving the app or closing ends it.
 */
export function OnceViewer({
  photo,
  onClose,
}: {
  photo: PhotoRef;
  onClose: (viewed: boolean) => void;
}) {
  const isClip = photo.media !== "photo";
  const { t } = useI18n();
  // A clip gets a little extra time so a full 5-second recording can finish.
  const budget = (isClip ? VIEW_SECONDS + 1 : VIEW_SECONDS) * 1000;
  const canvas = useRef<HTMLCanvasElement>(null);
  const bitmap = useRef<ImageBitmap | null>(null);
  const player = useRef<HTMLMediaElement | null>(null);
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "gone">("loading");
  const [holding, setHolding] = useState(false);
  const [left, setLeft] = useState(budget);
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
    let url: string | null = null;
    void loadOnce(photo)
      .then(async (blob) => {
        if (cancelled) return;
        if (!blob) return setStatus("gone");
        viewed.current = true;
        if (isClip) {
          url = URL.createObjectURL(blob);
          setClipUrl(url);
        } else {
          bitmap.current = await createImageBitmap(blob);
        }
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("gone"));
    return () => {
      cancelled = true;
      bitmap.current?.close();
      bitmap.current = null;
      player.current?.pause();
      if (url) URL.revokeObjectURL(url);
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

  // Clips: play while held, pause on release.
  useEffect(() => {
    const el = player.current;
    if (!isClip || !el || status !== "ready") return;
    if (holding) void el.play().catch(() => {});
    else el.pause();
  }, [holding, status, isClip]);

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
      aria-label={
        photo.media === "audio"
          ? t("One-time voice note")
          : photo.media === "video"
            ? t("One-time video")
            : t("One-time photo")
      }
      className="fixed inset-0 z-50 grid touch-none place-items-center bg-black select-none [-webkit-touch-callout:none]"
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={() => press(true)}
      onPointerUp={() => press(false)}
      onPointerLeave={() => press(false)}
      onPointerCancel={() => press(false)}
    >
      {isClip ? (
        photo.media === "video" ? (
          <video
            ref={(el) => {
              player.current = el;
            }}
            src={clipUrl ?? undefined}
            playsInline
            disablePictureInPicture
            controls={false}
            controlsList="nodownload noremoteplayback"
            onEnded={() => closeRef.current(true)}
            className={holding ? "block max-h-full max-w-full" : "hidden"}
          />
        ) : (
          <audio
            ref={(el) => {
              player.current = el;
            }}
            src={clipUrl ?? undefined}
            controls={false}
            onEnded={() => closeRef.current(true)}
          />
        )
      ) : (
        <canvas ref={canvas} className={holding ? "block" : "hidden"} />
      )}
      {holding && photo.media === "audio" ? (
        <div className="text-center text-white">
          <Mic className="mx-auto mb-3 animate-pulse" size={40} />
          <p className="font-semibold">{t("Playing…")}</p>
        </div>
      ) : null}
      {!holding ? (
        <div className="px-8 text-center text-white">
          {status === "loading" ? <p className="text-sm text-white/70">{t("Opening…")}</p> : null}
          {status === "gone" ? (
            <p className="text-sm text-white/80">
              {t("This has already been opened, or it’s no longer available.")}
            </p>
          ) : null}
          {status === "ready" ? (
            <>
              {photo.media === "audio" ? (
                <Mic className="mx-auto mb-3 text-white/80" size={28} />
              ) : photo.media === "video" ? (
                <Video className="mx-auto mb-3 text-white/80" size={28} />
              ) : (
                <Eye className="mx-auto mb-3 text-white/80" size={28} />
              )}
              <p className="font-semibold">
                {photo.media === "audio"
                  ? t("Press and hold to listen")
                  : photo.media === "video"
                    ? t("Press and hold to play")
                    : t("Press and hold to view")}
              </p>
              <p className="mt-1 text-sm text-white/60 tabular-nums">
                {t("{n} s left · can’t be opened again", { n: Math.ceil(left / 1000) })}
              </p>
            </>
          ) : null}
        </div>
      ) : (
        <span className="absolute bottom-6 rounded-full bg-black/50 px-3 py-1 text-xs text-white/80 tabular-nums">
          {`${Math.ceil(left / 1000)} s`}
        </span>
      )}
      <button
        type="button"
        aria-label={t("Close")}
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
