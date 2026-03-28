import { createHmac, randomBytes } from "crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // unambiguous chars (no 0/O/1/I)
const CODE_LENGTH = 5;

/**
 * Generates a human-readable, shareable person code like "UKOO-7K3M2".
 * Uses cryptographically random bytes for collision safety.
 */
export function generatePersonCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  const chars = Array.from(bytes)
    .map((b) => ALPHABET[b % ALPHABET.length])
    .join("");

  return `UKOO-${chars}`;
}

/**
 * Normalises a phone number to E.164 format (best-effort).
 * Strips spaces, dashes, parentheses; adds "+" prefix if missing.
 * Returns null if the result looks unusable (< 7 digits).
 */
export function normalisePhone(raw: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  // Allow leading + or treat bare digits as-is
  const normalised = digits.startsWith("+") ? digits : `+${digits}`;
  const digitCount = normalised.replace("+", "").length;

  if (digitCount < 7 || digitCount > 15) return null;

  return normalised;
}

/**
 * Returns an HMAC-SHA256 hex digest of the normalised phone.
 * The secret key is stored in PHONE_HASH_SECRET env var.
 * Never stores or returns the plaintext phone number.
 */
export function hashPhone(phone: string): string {
  const secret = process.env.PHONE_HASH_SECRET || "ukoo-phone-hash-secret";
  const normalised = normalisePhone(phone);

  if (!normalised) throw new Error("Invalid phone number format.");

  return createHmac("sha256", secret).update(normalised).digest("hex");
}

/**
 * Convenience: hash only if the input looks like a valid phone number,
 * otherwise return null without throwing.
 */
export function tryHashPhone(raw: string): string | null {
  try {
    const normalised = normalisePhone(raw);

    if (!normalised) return null;

    return hashPhone(normalised);
  } catch {
    return null;
  }
}
