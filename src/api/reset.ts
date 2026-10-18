import { type Request, type Response } from "express";
import config from "../config.js";

export function handlerReset(req: Request, res: Response) {
    config.fileserverHits = 0;
    // write() puts the body on the wire, end() closes the response.
    res.write("Hits reset to 0");
    res.end();
}
