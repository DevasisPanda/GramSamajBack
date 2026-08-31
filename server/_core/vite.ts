import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const possiblePaths = [
    path.resolve(process.cwd(), "dist", "public"),
    path.resolve(__dirname, "public"),
    path.resolve(__dirname, "..", "dist", "public"),
    path.resolve(process.cwd(), "public"),
  ];

  const foundPath = possiblePaths.find((p) => fs.existsSync(path.join(p, "index.html")));
  const distPath = foundPath || path.resolve(process.cwd(), "dist", "public");

  if (!foundPath) {
    console.warn(`[serveStatic] Could not find dist/public/index.html in any known path. Attempted:`, possiblePaths);
  } else {
    console.log(`[serveStatic] Serving static files from: ${distPath}`);
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(200).send(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <title>AIRD Management System API</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; text-align: center; background: #f8fafc; color: #1e293b; }
              .card { max-width: 500px; margin: 60px auto; padding: 30px; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
              .badge { display: inline-block; padding: 4px 12px; background: #dcfce7; color: #15803d; border-radius: 9999px; font-weight: 600; font-size: 14px; margin-bottom: 16px; }
              code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="card">
              <span class="badge">API Status: Online & Running</span>
              <h2>AIRD Management System API</h2>
              <p>Backend services are active and ready.</p>
              <p>tRPC Endpoint: <code>/api/trpc</code></p>
              <hr style="margin: 20px 0; border: 0; border-top: 1px solid #e2e8f0;" />
              <p style="font-size: 13px; color: #64748b;">Appropriate Institute of Rural Development (AIRD Trust)</p>
            </div>
          </body>
        </html>
      `);
    }
  });
}
