import { type Request, type Response } from "express";

// Liveness probe: a machine-readable "the server is up".
export function handlerReadiness(req: Request, res: Response) {
    res.set("Content-Type", "text/plain; charset=utf-8");
    res.send("OK");
}
