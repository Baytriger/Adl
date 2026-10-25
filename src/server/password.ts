import "server-only";
import { randomBytes, randomInt, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

export const MIN_PASSWORD = 10;
const KEYLEN = 64;
const COST: ScryptOptions = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

const derive = (password: string, salt: Buffer) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(password.normalize("NFKC"), salt, KEYLEN, COST, (err, key) => (err ? reject(err) : resolve(key))),
  );

/** "scrypt$<salt>$<hash>", both base64. Cost parameters are fixed in code, so they are not stored. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

// A real hash to compare against when the email is unknown, so timing doesn't reveal which emails exist.
let dummy: Promise<string> | undefined;

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  const hash = stored ?? (await (dummy ??= hashPassword(randomBytes(12).toString("hex"))));
  const [scheme, saltB64, keyB64] = hash.split("$");
  if (scheme !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const actual = await derive(password, Buffer.from(saltB64, "base64"));
  return stored != null && expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Returns a message if the password is not acceptable. */
export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (password.length > 200) return "That password is too long.";
  if (/^(.)\1+$/.test(password)) return "Use more than one repeated character.";
  if (["password", "1234567890", "qwertyuiop"].some((w) => password.toLowerCase().includes(w))) return "That password is too easy to guess.";
  return null;
}

/** Readable temporary password with no look-alike characters, e.g. "kemo-4tuv-pxqa-7mwd". */
export function temporaryPassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const group = () => Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join("");
  return [group(), group(), group(), group()].join("-");
}
