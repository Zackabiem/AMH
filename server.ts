import 'dotenv/config';
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import http from 'http';
import cors from 'cors';
import sql from './db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // API routes (Local Dev Proxy to Vercel Functions)
  const handleApiRoute = (route: string, handlerPath: string) => {
    app.all(route, async (req, res) => {
      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }
      
      console.log(`[API] ${req.method} ${route} - Request received`);
      try {
        const absolutePath = path.resolve(__dirname, handlerPath);
        const handler = await import(pathToFileURL(absolutePath).href);
        await handler.default(req as any, res as any);
        console.log(`[API] ${req.method} ${route} - Success`);
      } catch (error) {
        console.error(`[API] ${req.method} ${route} - Error:`, error);
        if (!res.headersSent) {
          res.status(500).json({ 
            error: 'Internal Server Error', 
            message: error instanceof Error ? error.message : String(error) 
          });
        }
      }
    });
  };

  handleApiRoute("/api/health", './api/health.ts');
  handleApiRoute("/api/db-test", './api/db-test.ts');
  handleApiRoute("/api/payments/process", './api/payments/process.ts');
  handleApiRoute("/api/cloudinary/sign", './api/cloudinary/sign.ts');
  handleApiRoute("/api/catalog-data", './api/products/feed.ts');
  handleApiRoute("/api/catalog-clear", './api/products/clear-cache.ts');
  handleApiRoute("/api/estate-data", './api/properties/feed.ts');
  handleApiRoute("/api/estate-clear", './api/properties/clear-cache.ts');
  handleApiRoute("/api/auth/session", './api/auth/session.ts');
  handleApiRoute("/api/exchange-rates", './api/exchange-rates.ts');
  handleApiRoute("/api/updates/cleanup", './api/updates/cleanup.ts');

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: { server }
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
