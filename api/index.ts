import type { Request, Response } from "express";
// @ts-ignore - bundled at build time by esbuild (see package.json "build")
import { createApiApp } from "./_app.mjs";

const app = createApiApp();

export default function handler(req: Request, res: Response) {
  if (req.url && !req.url.startsWith("/api/") && req.url !== "/api") {
    req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
  }

  return app(req, res);
}
