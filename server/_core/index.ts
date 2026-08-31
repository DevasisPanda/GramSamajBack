import "dotenv/config";

// Sanitize CLOUDINARY_URL to prevent crash if malformed
if (process.env.CLOUDINARY_URL) {
  const url = process.env.CLOUDINARY_URL.trim();
  if (!url.startsWith("cloudinary://") || !url.includes("@")) {
    console.warn("⚠️ [Startup] Malformed CLOUDINARY_URL detected (missing @<cloud_name>). Disabling auto-config to prevent crash.");
    delete process.env.CLOUDINARY_URL;
  }
}

process.on("uncaughtException", (err) => {
  console.error("FATAL UNCAUGHT EXCEPTION AT STARTUP:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("FATAL UNHANDLED REJECTION AT STARTUP:", reason);
});

import express from "express";
import cors from "cors";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { razorpayWebhookRouter } from "../routes/webhooks";
import { receiptRouter } from "../routes/receipts";

import helmet from "helmet";
import { rateLimit } from "express-rate-limit";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  
  // Enable 'trust proxy' so express-rate-limit gets real IP behind Render proxy
  app.set("trust proxy", 1);
  
  // Use Helmet for basic security headers (permissive CSP for CDN media compatibility)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false, // Required for Razorpay payment popup (bank simulation)
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      xFrameOptions: { action: "sameorigin" },
    })
  );

  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map(o => o.trim().replace(/\/$/, ""))
    : [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://airdup.com",
        "https://www.airdup.com",
      ].map(o => o.replace(/\/$/, ""));

  
  // Configure CORS middleware
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      
      const normalizedOrigin = origin.trim().replace(/\/$/, "");
      
      // Match exact or wildcard patterns
      const isAllowed = allowedOrigins.some(allowed => {
        if (allowed === normalizedOrigin) return true;
        if (allowed.includes('*')) {
          const regex = new RegExp('^' + allowed.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
          return regex.test(normalizedOrigin);
        }
        return false;
      });

      // Automatically allow any vercel.app, onrender.com, sslip.io, or localhost domain
      const isVercelPreview = normalizedOrigin.endsWith(".vercel.app");
      const isRenderInternal = normalizedOrigin.endsWith(".onrender.com");
      const isSslipIo = normalizedOrigin.endsWith(".sslip.io");
      const isLocalhost = normalizedOrigin.includes("localhost") || normalizedOrigin.includes("127.0.0.1");

      if (isAllowed || isVercelPreview || isRenderInternal || isSslipIo || isLocalhost) {
        return callback(null, true);
      }

      console.warn(`[CORS Blocked] Request from origin "${origin}" was rejected.`);
      callback(null, false);
    },
    credentials: true,
  }));
  const server = createServer(app);
  
  // Configure body parser with 10MB limit for base64 image uploads
  app.use(
    express.json({
      limit: "10mb",
      verify: (req: any, res, buf) => {
        req.rawBody = buf.toString();
      },
    })
  );
  app.use(express.urlencoded({ limit: "10mb", extended: true }));
  
  // Webhooks Router
  app.use("/api/webhooks/razorpay", razorpayWebhookRouter);
  
  // Receipt Download Router
  app.use("/api/receipts", receiptRouter);
  
  // Rate Limiting has been disabled to ensure smooth logins and prevent proxy IP mismatch blocks
  
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "5000");

  server.listen(port, "0.0.0.0", () => {
    console.log(`\n🚀 Server running at:`);
    console.log(`   > Local:   http://localhost:${port}/`);
    console.log(`   > Network: http://127.0.0.1:${port}/\n`);
  });
}

startServer().catch(console.error);
