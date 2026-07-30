import crypto from "crypto";
import { env } from "../config/env";

const ALGORITHM = "aes-256-cbc";

// Hash the encryption key to ensure it is exactly 32 bytes
const KEY = crypto
  .createHash("sha256")
  .update(env.WHATSAPP_TOKEN_ENCRYPTION_KEY)
  .digest();

export function encrypt(text: string): string {
  if (!text) return "";
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText) return "";
  try {
    const parts = encryptedText.split(":");
    const ivHex = parts.shift();
    if (!ivHex) return "";
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = parts.join(":");
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error);
    return "";
  }
}
