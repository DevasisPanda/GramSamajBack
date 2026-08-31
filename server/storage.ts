import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import crypto from "crypto";

// Safely validate and configure Cloudinary
let isCloudinaryConfigured = false;

const rawCloudinaryUrl = process.env.CLOUDINARY_URL;
if (rawCloudinaryUrl) {
  try {
    if (rawCloudinaryUrl.startsWith("cloudinary://") && rawCloudinaryUrl.includes("@")) {
      cloudinary.config(rawCloudinaryUrl);
      isCloudinaryConfigured = true;
    } else {
      console.warn(
        "⚠️ [Storage] Invalid CLOUDINARY_URL format. Expected: cloudinary://<api_key>:<api_secret>@<cloud_name>. Falling back to local/base64 data storage."
      );
    }
  } catch (err: any) {
    console.warn("⚠️ [Storage] Failed to initialize Cloudinary:", err?.message || err);
  }
} else if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  isCloudinaryConfigured = true;
} else {
  console.warn("⚠️ [Storage] CLOUDINARY_URL is not set in environment variables. Falling back to base64 storage.");
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "image/jpeg",
): Promise<{ key: string; url: string }> {
  const buffer = typeof data === "string" 
    ? Buffer.from(data, "utf-8") 
    : Buffer.from(data);

  if (!isCloudinaryConfigured) {
    console.warn("[Storage] Cloudinary not configured. Falling back to data URI.");
    const base64Str = buffer.toString("base64");
    const mime = contentType.startsWith("image/") ? contentType : "image/jpeg";
    return { key: relKey, url: `data:${mime};base64,${base64Str}` };
  }

  const key = appendHashSuffix(normalizeKey(relKey));
  


  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: key.replace(/\.[^/.]+$/, ""), // Cloudinary doesn't need extension in public_id
        resource_type: "auto",
        folder: "ngo-management",
      },
      (error, result) => {
        if (error || !result) {
          return reject(new Error(`Cloudinary upload failed: ${error?.message || "Unknown error"}`));
        }
        resolve({ key: result.public_id, url: result.secure_url });
      }
    );

    uploadStream.end(buffer);
  });
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  // Cloudinary URLs are generally permanent, but if we just stored the key, we'd reconstruct it.
  // In our DB, we usually save the full URL returned from storagePut, so this is just a stub.
  const key = normalizeKey(relKey);
  return { key, url: relKey }; // Returning as-is assuming full URL is passed
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  // Cloudinary assets are public by default unless strictly configured otherwise.
  return relKey; // Return the URL directly.
}
