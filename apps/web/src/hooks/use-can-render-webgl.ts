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

function subscribe(): () => void {
  return () => {};
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
