import { type Request, type Response } from "express";
import config from "../config.js";

// Reports the count; incrementing is the middleware's job.
export function handlerMetricsReport(req: Request, res: Response) {
    res.set("Content-Type", "text/html; charset=utf-8");
    const html = `<html>
  <body>
    <h1>Welcome, Chirpy Admin</h1>
    <p>Chirpy has been visited ${config.fileserverHits} times!</p>
  </body>
</html>`;
    // Into the response body, not the server log.
    res.send(html);

}
