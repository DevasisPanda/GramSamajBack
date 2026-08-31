import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../storage";

export const uploadRouter = router({
  // Public procedure so new applicants can upload member photo during registration
  image: publicProcedure
    .input(
      z.object({
        base64: z.string().min(1, "Base64 data is required"),
        filename: z.string().default("upload"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Parse MIME type from base64 data url for security
        const mimeMatch = input.base64.match(/^data:([^;]+);base64,/);
        if (!mimeMatch) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid file format. Base64 data URI with a valid MIME type prefix is required.",
          });
        }
        const mime = mimeMatch[1];
        // Restrict to images and PDFs
        if (!mime.startsWith("image/") && mime !== "application/pdf") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Unsupported file type. Only images and PDFs are allowed.",
          });
        }

        // Strip out the data URL prefix if present (e.g. data:image/png;base64, or data:video/mp4;base64,)
        const base64Data = input.base64.replace(/^data:[^;]+;base64,/, "");
        
        // Convert to Buffer
        const buffer = Buffer.from(base64Data, "base64");
        
        // Size check — reject files larger than 5MB
        const MAX_FILE_SIZE = 5 * 1024 * 1024;
        if (buffer.length > MAX_FILE_SIZE) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `File size exceeds the 5MB limit. Received ${(buffer.length / (1024 * 1024)).toFixed(1)}MB.`,
          });
        }
        
        // Use storagePut to upload to Cloudinary
        // `storagePut` automatically generates a secure unique ID
        const result = await storagePut(input.filename, buffer);
        
        return { success: true, url: result.url };
      } catch (error) {
        console.error("Upload error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to upload image to Cloudinary",
        });
      }
    }),
});
