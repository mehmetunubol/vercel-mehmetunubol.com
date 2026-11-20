/**
 * End-to-end message encryption, run in the browser with WebCrypto.
 * The server only ever stores public keys, password-encrypted private keys,
 * and ciphertext.
 *
 * Identity: each user has an ECDH P-256 key pair. The private key is stored on
 * the server only as AES-GCM ciphertext under a key derived from the user's
 * password (PBKDF2-SHA256), and locally as a non-extractable CryptoKey.
 *
 * Messages: each message gets a fresh random AES-256-GCM key. That key is
 * wrapped once per recipient (including the sender) with an AES-GCM key
 * derived via HKDF from ECDH(sender, recipient). The conversation id, sender id
 * and message id are bound in as additional authenticated data, so the server
 * cannot move a message to another chat or attribute it to someone else.
 */

const subtle = globalThis.crypto.subtle;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const PBKDF2_ITERATIONS = 600_000;
const WRAP_INFO = encoder.encode("office/message-key-wrap/v1");
const ECDH_PARAMS = { name: "ECDH", namedCurve: "P-256" } as const;

export function toBase64(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

export function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  return globalThis.crypto.getRandomValues(new Uint8Array(length));
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

export function messageAad(conversationId: string, senderId: string, messageId: string) {
  return encoder.encode(`${conversationId}|${senderId}|${messageId}`);
}

// --- Identity keys --------------------------------------------------------

export interface Identity {
  privateKey: CryptoKey;
  publicKey: string; // base64 SPKI
}

interface PrivateKeyBundle {
  v: 1;
  iter: number;
  salt: string;
  iv: string;
  ct: string;
}

async function passwordKey(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const base = await subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
    "deriveKey",
  ]);
  return subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Creates a new identity. Returns the encrypted bundle to upload and the usable identity. */
export async function createIdentity(
  password: string,
  iterations = PBKDF2_ITERATIONS,
): Promise<{ identity: Identity; encryptedPrivateKey: string }> {
  const pair = await subtle.generateKey(ECDH_PARAMS, true, ["deriveBits"]);
  const pkcs8 = new Uint8Array(await subtle.exportKey("pkcs8", pair.privateKey));
  const publicKey = toBase64(await subtle.exportKey("spki", pair.publicKey));
  const encryptedPrivateKey = await sealPrivateKey(pkcs8, password, iterations);
  // Re-import as non-extractable so the stored key can't be exported later.
  const privateKey = await subtle.importKey("pkcs8", pkcs8, ECDH_PARAMS, false, ["deriveBits"]);
  pkcs8.fill(0);
  return { identity: { privateKey, publicKey }, encryptedPrivateKey };
}

async function sealPrivateKey(
  pkcs8: Uint8Array<ArrayBuffer>,
  password: string,
  iterations: number,
) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await passwordKey(password, salt, iterations);
  const ct = await subtle.encrypt({ name: "AES-GCM", iv }, key, pkcs8);
  const bundle: PrivateKeyBundle = {
    v: 1,
    iter: iterations,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ct: toBase64(ct),
  };
  return JSON.stringify(bundle);
}

async function openPrivateKeyBytes(encryptedPrivateKey: string, password: string) {
  const bundle = JSON.parse(encryptedPrivateKey) as PrivateKeyBundle;
  if (bundle.v !== 1) throw new Error("Unsupported key bundle version");
  const key = await passwordKey(password, fromBase64(bundle.salt), bundle.iter);
  return new Uint8Array(
    await subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(bundle.iv) },
      key,
      fromBase64(bundle.ct),
    ),
  );
}

/** Decrypts the server-held bundle. Throws if the password is wrong. */
export async function unlockIdentity(
  encryptedPrivateKey: string,
  publicKey: string,
  password: string,
): Promise<Identity> {
  const pkcs8 = await openPrivateKeyBytes(encryptedPrivateKey, password);
  const privateKey = await subtle.importKey("pkcs8", pkcs8, ECDH_PARAMS, false, ["deriveBits"]);
  pkcs8.fill(0);
  return { privateKey, publicKey };
}

/** Re-encrypts the private key under a new password (for password changes). */
export async function rewrapPrivateKey(
  encryptedPrivateKey: string,
  currentPassword: string,
  newPassword: string,
  iterations = PBKDF2_ITERATIONS,
): Promise<string> {
  const pkcs8 = await openPrivateKeyBytes(encryptedPrivateKey, currentPassword);
  const sealed = await sealPrivateKey(pkcs8, newPassword, iterations);
  pkcs8.fill(0);
  return sealed;
}

// --- Message encryption ---------------------------------------------------

const pairKeyCache = new WeakMap<CryptoKey, Map<string, Promise<CryptoKey>>>();

function pairKey(privateKey: CryptoKey, peerPublicKey: string): Promise<CryptoKey> {
  let byPeer = pairKeyCache.get(privateKey);
  if (!byPeer) {
    byPeer = new Map();
    pairKeyCache.set(privateKey, byPeer);
  }
  let cached = byPeer.get(peerPublicKey);
  if (!cached) {
    cached = (async () => {
      const peer = await subtle.importKey(
        "spki",
        fromBase64(peerPublicKey),
        ECDH_PARAMS,
        false,
        [],
      );
      const shared = await subtle.deriveBits({ name: "ECDH", public: peer }, privateKey, 256);
      const hkdf = await subtle.importKey("raw", shared, "HKDF", false, ["deriveKey"]);
      return subtle.deriveKey(
        { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(32), info: WRAP_INFO },
        hkdf,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
      );
    })();
    cached.catch(() => byPeer!.delete(peerPublicKey));
    byPeer.set(peerPublicKey, cached);
  }
  return cached;
}

export interface EncryptedMessage {
  ciphertext: string;
  iv: string;
  keys: Record<string, string>;
}

export async function encryptMessage(
  plaintext: string,
  sender: Identity,
  recipients: Record<string, string>, // userId -> public key (include the sender)
  aad: Uint8Array<ArrayBuffer>,
): Promise<EncryptedMessage> {
  const messageKey = await subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
  const iv = randomBytes(12);
  const ciphertext = await subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: aad },
    messageKey,
    encoder.encode(plaintext),
  );
  const rawKey = new Uint8Array(await subtle.exportKey("raw", messageKey));

  const keys: Record<string, string> = {};
  await Promise.all(
    Object.entries(recipients).map(async ([userId, publicKey]) => {
      const wrapKey = await pairKey(sender.privateKey, publicKey);
      const wrapIv = randomBytes(12);
      const wrapped = await subtle.encrypt(
        { name: "AES-GCM", iv: wrapIv, additionalData: aad },
        wrapKey,
        rawKey,
      );
      keys[userId] = toBase64(concat(wrapIv, new Uint8Array(wrapped)));
    }),
  );
  rawKey.fill(0);

  return { ciphertext: toBase64(ciphertext), iv: toBase64(iv), keys };
}

export async function decryptMessage(
  message: { ciphertext: string; iv: string; wrappedKey: string; senderPublicKey: string },
  recipientPrivateKey: CryptoKey,
  aad: Uint8Array<ArrayBuffer>,
): Promise<string> {
  const wrapKey = await pairKey(recipientPrivateKey, message.senderPublicKey);
  const wrapped = fromBase64(message.wrappedKey);
  const rawKey = await subtle.decrypt(
    { name: "AES-GCM", iv: wrapped.slice(0, 12), additionalData: aad },
    wrapKey,
    wrapped.slice(12),
  );
  const messageKey = await subtle.importKey("raw", rawKey, "AES-GCM", false, ["decrypt"]);
  const plaintext = await subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(message.iv), additionalData: aad },
    messageKey,
    fromBase64(message.ciphertext),
  );
  return decoder.decode(plaintext);
}
