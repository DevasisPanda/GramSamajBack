import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getSecretKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? "" : "default_fallback_secret_32_chars_long_key!!");
  if (!secret) {
    throw new Error("ENCRYPTION_KEY or JWT_SECRET must be configured in environment variables!");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts a string using AES-256-GCM.
 * Returns format: iv:authTag:encryptedData
 */
export function encryptField(plaintext: string | null | undefined): string | null {
  if (!plaintext || plaintext.trim() === "") return null;

  try {
    const key = getSecretKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag().toString("hex");

    return `${iv.toString("hex")}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error("Encryption error:", error);
    return plaintext;
  }
}

/**
 * Decrypts an AES-256-GCM encrypted string (format: iv:authTag:encryptedData).
 * If string is not in encrypted format (e.g. legacy plaintext), returns it as-is.
 */
export function decryptField(encryptedText: string | null | undefined): string | null {
  if (!encryptedText || encryptedText.trim() === "") return null;

  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    // Return legacy plaintext if not encrypted format
    return encryptedText;
  }

  try {
    const [ivHex, authTagHex, encryptedDataHex] = parts;
    const key = getSecretKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedDataHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    // If decryption fails, return as-is (graceful fallback)
    return encryptedText;
  }
}
