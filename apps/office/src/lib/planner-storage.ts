"use client";

/** The Day Planner decoy keeps everything in this browser only. */
export function loadLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or storage full: the change just won't persist.
  }
}

export function clearPlannerData() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("day-planner:")) localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}
