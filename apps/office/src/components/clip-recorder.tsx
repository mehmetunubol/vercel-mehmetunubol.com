"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Video, X } from "lucide-react";
import { MAX_CLIP_SECONDS } from "@/lib/photo";

export interface RecordedClip {
  bytes: Uint8Array<ArrayBuffer>;
  mime: string;
  duration: number;
  width: number;
  height: number;
}

/** The first container/codec this browser can record (Safari: mp4, others: webm). */
function pickMime(kind: "audio" | "video") {
  const options =
    kind === "audio"
      ? ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"]
      : ["video/mp4", "video/webm;codecs=vp8,opus", "video/webm"];
  return (
    options.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) ??
    ""
  );
}

/**
 * Records a voice note or a selfie-camera video inside the app, stopping
 * automatically at 5 seconds. Nothing leaves the device until "Send".
 */
export function ClipRecorder({
  kind,
  onSend,
  onClose,
}: {
  kind: "audio" | "video";
  onSend: (clip: RecordedClip) => void;
  onClose: () => void;
}) {
  const preview = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const startedAt = useRef(0);
  const [phase, setPhase] = useState<"starting" | "ready" | "recording" | "done" | "error">(
    "starting",
  );
  const [elapsed, setElapsed] = useState(0);
  const [clip, setClip] = useState<RecordedClip | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Ask for the microphone (and camera) once; release them when closing.
  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({
        audio: true,
        video:
          kind === "video"
            ? { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }
            : false,
      })
      .then((media) => {
        if (cancelled) return media.getTracks().forEach((t) => t.stop());
        stream.current = media;
        if (preview.current) preview.current.srcObject = media;
        setPhase("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setError(
          kind === "video"
            ? "Camera or microphone isn't available. Allow access in your browser or phone settings."
            : "The microphone isn't available. Allow access in your browser or phone settings.",
        );
        setPhase("error");
      });
    return () => {
      cancelled = true;
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, [kind]);

  // Countdown while recording; stop at the limit.
  useEffect(() => {
    if (phase !== "recording") return;
    const timer = setInterval(() => {
      const seconds = (Date.now() - startedAt.current) / 1000;
      setElapsed(Math.min(seconds, MAX_CLIP_SECONDS));
      if (seconds >= MAX_CLIP_SECONDS) recorder.current?.stop();
    }, 100);
    return () => clearInterval(timer);
  }, [phase]);

  function start() {
    if (!stream.current) return;
    const mime = pickMime(kind);
    const rec = new MediaRecorder(stream.current, {
      ...(mime ? { mimeType: mime } : {}),
      audioBitsPerSecond: 48_000,
      ...(kind === "video" ? { videoBitsPerSecond: 900_000 } : {}),
    });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = async () => {
      const duration = Math.min((Date.now() - startedAt.current) / 1000, MAX_CLIP_SECONDS);
      const blob = new Blob(chunks, {
        type: rec.mimeType || mime || (kind === "audio" ? "audio/webm" : "video/webm"),
      });
      const video = preview.current;
      setClip({
        bytes: new Uint8Array(await blob.arrayBuffer()),
        mime: blob.type,
        duration: Math.round(duration * 10) / 10,
        width: kind === "video" ? (video?.videoWidth ?? 0) : 0,
        height: kind === "video" ? (video?.videoHeight ?? 0) : 0,
      });
      setPhase("done");
    };
    recorder.current = rec;
    startedAt.current = Date.now();
    setElapsed(0);
    rec.start();
    setPhase("recording");
  }

  const Icon = kind === "audio" ? Mic : Video;
  const left = Math.max(0, MAX_CLIP_SECONDS - elapsed);

  return (
    <div
      role="dialog"
      aria-label={kind === "audio" ? "Record a voice note" : "Record a video"}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <section className="glass-strong rise w-full max-w-sm space-y-4 rounded-[1.75rem] p-5 text-center">
        <div className="flex items-center justify-between">
          <p className="eyebrow">
            {kind === "audio" ? "Voice note · listen once" : "Video · view once"}
          </p>
          <button
            type="button"
            aria-label="Cancel recording"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full hover:bg-[var(--hairline)]"
          >
            <X size={18} />
          </button>
        </div>

        {kind === "video" ? (
          <video
            ref={preview}
            autoPlay
            muted
            playsInline
            className="mx-auto aspect-[4/3] w-full rounded-2xl bg-black object-cover [transform:scaleX(-1)]"
          />
        ) : (
          <div
            className={`mx-auto grid size-24 place-items-center rounded-full ${phase === "recording" ? "bg-[color-mix(in_oklab,var(--danger)_18%,transparent)] text-[var(--danger)]" : "bg-[var(--field)]"}`}
          >
            <Icon size={34} />
          </div>
        )}

        <p className="text-sm text-[var(--ink-2)] tabular-nums" aria-live="polite">
          {phase === "starting" && "Getting ready…"}
          {phase === "ready" && `Up to ${MAX_CLIP_SECONDS} seconds. They can play it once.`}
          {phase === "recording" && `Recording · ${left.toFixed(1)} s left`}
          {phase === "done" && clip && `Recorded ${clip.duration.toFixed(1)} s`}
          {phase === "error" && error}
        </p>

        <div className="flex justify-center gap-2">
          {phase === "ready" ? (
            <button type="button" onClick={start} className="btn btn-primary">
              <Icon size={17} /> Record
            </button>
          ) : null}
          {phase === "recording" ? (
            <button
              type="button"
              onClick={() => recorder.current?.stop()}
              className="btn btn-danger"
            >
              <Square size={15} /> Stop
            </button>
          ) : null}
          {phase === "done" && clip ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setClip(null);
                  setPhase("ready");
                }}
                className="btn btn-quiet"
              >
                Record again
              </button>
              <button type="button" onClick={() => onSend(clip)} className="btn btn-primary">
                Send
              </button>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
