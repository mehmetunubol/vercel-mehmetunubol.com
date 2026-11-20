"use client";

import { createIdentity, type Identity, unlockIdentity } from "@/lib/crypto";
import { saveIdentity } from "@/lib/keystore";

/**
 * After sign-in: decrypt the user's private key with their password (or create
 * a key pair on first sign-in) and keep it in this browser.
 */
export async function setupIdentity(password: string): Promise<Identity> {
  const response = await fetch("/api/me/keys", { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load your keys.");
  const data = (await response.json()) as {
    userId: string;
    publicKey: string | null;
    encryptedPrivateKey: string | null;
  };

  let identity: Identity;
  if (data.publicKey && data.encryptedPrivateKey) {
    try {
      identity = await unlockIdentity(data.encryptedPrivateKey, data.publicKey, password);
    } catch {
      throw new Error("Wrong password.");
    }
  } else {
    const created = await createIdentity(password);
    const upload = await fetch("/api/me/keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        publicKey: created.identity.publicKey,
        encryptedPrivateKey: created.encryptedPrivateKey,
      }),
    });
    if (upload.status === 409) return setupIdentity(password); // another device won the race
    if (!upload.ok) throw new Error("Could not save your keys.");
    identity = created.identity;
  }
  await saveIdentity(data.userId, identity);
  return identity;
}
