import type { Request, Response } from "express";

type AppFn = (req: unknown, res: unknown) => void;

let cachedApp: AppFn | null = null;
let initError: unknown = null;

async function loadApp(): Promise<AppFn | null> {
  if (cachedApp || initError) return cachedApp;
  try {
    const mod = await import("../server/_core/app");
    cachedApp = mod.createApiApp() as unknown as AppFn;
  } catch (e) {
    initError = e;
  }
  return cachedApp;
}

export default async function handler(req: Request, res: Response) {
  const app = await loadApp();

  if (initError) {
    const err = initError as { stack?: string; message?: string };
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({ __diag: true, error: String(err?.stack || err?.message || initError) })
    );
    return;
  }

  if (req.url && !req.url.startsWith("/api/") && req.url !== "/api") {
    req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
  }

  return app!(req, res);
}
