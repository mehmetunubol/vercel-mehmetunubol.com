"use client";

import type { Identity } from "@/lib/crypto";

// The unlocked private key lives in IndexedDB as a non-extractable CryptoKey:
// usable by this origin for decryption, but not exportable as bytes.
const DB_NAME = "office-keys";
const STORE = "identities";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = fn(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function loadIdentity(userId: string): Promise<Identity | null> {
  try {
    return ((await run("readonly", (s) => s.get(userId))) as Identity | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function saveIdentity(userId: string, identity: Identity) {
  await run("readwrite", (s) => s.put(identity, userId));
}

export async function clearIdentities() {
  try {
    await run("readwrite", (s) => s.clear());
  } catch {
    // Nothing stored, or storage unavailable.
  }
}
