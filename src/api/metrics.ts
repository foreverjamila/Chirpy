import { type Request, type Response } from "express";
import config from "../config.js";

// Reports the count; incrementing is the middleware's job.
export function handlerMetricsReport(req: Request, res: Response) {
    res.set("Content-Type", "text/plain; charset=utf-8");
    // Into the response body, not the server log.
    res.send(`Hits: ${config.fileserverHits}`);

}
