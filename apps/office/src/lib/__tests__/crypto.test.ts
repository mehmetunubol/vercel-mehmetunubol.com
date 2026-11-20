import { describe, expect, it } from "vitest";
import {
  createIdentity,
  decryptMessage,
  encryptMessage,
  messageAad,
  rewrapPrivateKey,
  unlockIdentity,
} from "@/lib/crypto";

// Low PBKDF2 iteration count keeps tests fast; production uses the default.
const ITER = 1000;

async function user(password: string) {
  return createIdentity(password, ITER);
}

describe("identity", () => {
  it("unlocks with the right password and rejects the wrong one", async () => {
    const { identity, encryptedPrivateKey } = await user("correct horse");
    const unlocked = await unlockIdentity(encryptedPrivateKey, identity.publicKey, "correct horse");
    expect(unlocked.publicKey).toBe(identity.publicKey);
    await expect(
      unlockIdentity(encryptedPrivateKey, identity.publicKey, "wrong"),
    ).rejects.toThrow();
  });

  it("does not leave the plaintext private key in the bundle", async () => {
    const { encryptedPrivateKey } = await user("pw-12345");
    const bundle = JSON.parse(encryptedPrivateKey);
    expect(Object.keys(bundle).sort()).toEqual(["ct", "iter", "iv", "salt", "v"]);
  });

  it("rewraps under a new password", async () => {
    const { identity, encryptedPrivateKey } = await user("old-password");
    const rewrapped = await rewrapPrivateKey(
      encryptedPrivateKey,
      "old-password",
      "new-password",
      ITER,
    );
    await expect(unlockIdentity(rewrapped, identity.publicKey, "old-password")).rejects.toThrow();
    const unlocked = await unlockIdentity(rewrapped, identity.publicKey, "new-password");

    const peer = await user("peer");
    const aad = messageAad("c", "peer", "m");
    const enc = await encryptMessage("hi", peer.identity, { me: identity.publicKey }, aad);
    const text = await decryptMessage(
      { ...enc, wrappedKey: enc.keys.me!, senderPublicKey: peer.identity.publicKey },
      unlocked.privateKey,
      aad,
    );
    expect(text).toBe("hi");
  });
});

describe("messages", () => {
  it("every recipient (and the sender) can decrypt; outsiders cannot", async () => {
    const [alice, bob, carol, eve] = await Promise.all(["a", "b", "c", "e"].map((p) => user(p)));
    const aad = messageAad("conv-1", "alice", "msg-1");
    const enc = await encryptMessage(
      "Meet at 3 — ünicode ✓",
      alice!.identity,
      {
        alice: alice!.identity.publicKey,
        bob: bob!.identity.publicKey,
        carol: carol!.identity.publicKey,
      },
      aad,
    );
    expect(enc.ciphertext).not.toContain("Meet");

    for (const [id, who] of [
      ["alice", alice!],
      ["bob", bob!],
      ["carol", carol!],
    ] as const) {
      const text = await decryptMessage(
        { ...enc, wrappedKey: enc.keys[id]!, senderPublicKey: alice!.identity.publicKey },
        who.identity.privateKey,
        aad,
      );
      expect(text).toBe("Meet at 3 — ünicode ✓");
    }

    // Eve holds bob's wrapped key but not bob's private key.
    await expect(
      decryptMessage(
        { ...enc, wrappedKey: enc.keys.bob!, senderPublicKey: alice!.identity.publicKey },
        eve!.identity.privateKey,
        aad,
      ),
    ).rejects.toThrow();
  });

  it("fails if the server moves the message to another conversation or sender", async () => {
    const [alice, bob] = await Promise.all([user("a"), user("b")]);
    const enc = await encryptMessage(
      "secret",
      alice.identity,
      { bob: bob.identity.publicKey },
      messageAad("conv-1", "alice", "msg-1"),
    );
    const base = { ...enc, wrappedKey: enc.keys.bob!, senderPublicKey: alice.identity.publicKey };
    await expect(
      decryptMessage(base, bob.identity.privateKey, messageAad("conv-2", "alice", "msg-1")),
    ).rejects.toThrow();
    await expect(
      decryptMessage(base, bob.identity.privateKey, messageAad("conv-1", "mallory", "msg-1")),
    ).rejects.toThrow();
  });

  it("fails if the ciphertext is tampered with", async () => {
    const [alice, bob] = await Promise.all([user("a"), user("b")]);
    const aad = messageAad("c", "alice", "m");
    const enc = await encryptMessage(
      "secret",
      alice.identity,
      { bob: bob.identity.publicKey },
      aad,
    );
    const flipped =
      enc.ciphertext[0] === "A" ? "B" + enc.ciphertext.slice(1) : "A" + enc.ciphertext.slice(1);
    await expect(
      decryptMessage(
        {
          ...enc,
          ciphertext: flipped,
          wrappedKey: enc.keys.bob!,
          senderPublicKey: alice.identity.publicKey,
        },
        bob.identity.privateKey,
        aad,
      ),
    ).rejects.toThrow();
  });
});
