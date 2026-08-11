"use client";

import { useSyncExternalStore } from "react";

const MIN_VIEWPORT_WIDTH = 768;

function supportsWebgl(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function getSnapshot(): boolean {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wideEnough = window.innerWidth >= MIN_VIEWPORT_WIDTH;
  return !reduceMotion && wideEnough && supportsWebgl();
}

function getServerSnapshot(): boolean {
  return false;
}

const RESIZE_DEBOUNCE_MS = 200;

function subscribe(callback: () => void): () => void {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);

  // Debounced: a live window drag fires `resize` continuously, and
  // re-evaluating (and possibly mounting/unmounting the WebGL canvas) on
  // every single event mid-drag causes a visible flicker. Only react once
  // the width has settled.
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const onResize = () => {
    clearTimeout(timeout);
    timeout = setTimeout(callback, RESIZE_DEBOUNCE_MS);
  };
  window.addEventListener("resize", onResize);

  return () => {
    media.removeEventListener("change", callback);
    window.removeEventListener("resize", onResize);
    clearTimeout(timeout);
  };
}

/**
 * Gate for mounting decorative WebGL scenes: requires wide-enough viewport,
 * no reduced-motion preference, and actual WebGL support. Reads as `false`
 * on the server/first paint (matches SSR), resolved on the client via
 * `useSyncExternalStore` rather than an effect + setState.
 */
export function useCanRenderWebgl(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
