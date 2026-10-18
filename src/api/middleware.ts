import { type Request, type Response, type NextFunction } from "express";
import config from "../config.js";

export function middlewareLogResponses(req: Request, res: Response, next: NextFunction): void {
    // Deferred: the status code isn't settled until the response is sent.
    res.on("finish", () => {
        const statusCode = res.statusCode;
        // 300+ also catches 3xx (304, redirects), not just 4xx/5xx errors.
        if (statusCode >= 300) {
            console.log(`[NON-OK] ${req.method} ${req.url} - Status: ${statusCode}`);
        }

    });

    next();
}

export function middlewareMetricsInc(req: Request, res: Response, next: NextFunction) {
  // Single-threaded JS, so no locking needed here.
  config.fileserverHits++;

  next();
}
