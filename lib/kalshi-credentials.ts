/**
 * Encrypt/decrypt Kalshi private key for storage.
 * Requires KALSHI_CREDENTIALS_ENCRYPTION_KEY (32-byte hex = 64 chars).
 */

import crypto from "crypto";

const ALG = "aes-256-gcm";
const IV_LEN = 16;
const TAG_LEN = 16;
const KEY_LEN = 32;

function getKey(): Buffer {
  const raw = process.env.KALSHI_CREDENTIALS_ENCRYPTION_KEY;
  if (!raw || raw.length !== 64 || !/^[0-9a-fA-F]+$/.test(raw)) {
    throw new Error(
      "KALSHI_CREDENTIALS_ENCRYPTION_KEY must be 64 hex chars (32 bytes). Generate with: openssl rand -hex 32"
    );
  }
  return Buffer.from(raw, "hex");
}

export function encryptKalshiPrivateKey(plainPem: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALG, key, iv, { authTagLength: TAG_LEN });
  const enc = Buffer.concat([
    cipher.update(plainPem, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptKalshiPrivateKey(encryptedBase64: string): string {
  const key = getKey();
  const buf = Buffer.from(encryptedBase64, "base64");
  if (buf.length < IV_LEN + TAG_LEN) {
    throw new Error("Invalid encrypted payload");
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const enc = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALG, key, iv, { authTagLength: TAG_LEN });
  decipher.setAuthTag(tag);
  return decipher.update(enc) + decipher.final("utf8");
}

export function isKalshiEncryptionConfigured(): boolean {
  const raw = process.env.KALSHI_CREDENTIALS_ENCRYPTION_KEY;
  return !!(raw && raw.length === 64 && /^[0-9a-fA-F]+$/.test(raw));
}
