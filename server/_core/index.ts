import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "path";
import fs from "fs";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import reportRouter from "../reportApi";
import settingsRouter from "../settingsApi";

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
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Report & Settings API routes
  app.use('/api/report', reportRouter);
  app.use('/api/settings', settingsRouter);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // ===== 本地文件存储下载路由 =====
  // 为 storage.ts 中 storageGet 返回的 URL 提供文件下载服务
  // 必须注册在 Vite/serveStatic 的 catch-all 之前，否则会被 SPA fallback 拦截
  const LOCAL_DATA_DIR = path.resolve(process.cwd(), 'data');
  app.use('/api/local-storage', (req, res) => {
    // req.path 以 / 开头，例如 /yinbao-data/uploads/source.xlsx
    const relPath = req.path.replace(/^\/+/, '');
    if (!relPath || relPath.includes('..')) {
      res.status(400).json({ error: 'Invalid path' });
      return;
    }
    const fullPath = path.join(LOCAL_DATA_DIR, relPath);
    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ error: 'File not found' });
      return;
    }
    res.sendFile(fullPath);
  });

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
