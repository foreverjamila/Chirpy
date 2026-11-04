import { type Request, type Response } from "express";
import { config } from "../config.js";
import { UserForbiddenError } from "./errors.js";
import { reset } from "../db/queries/users.js";

export async function handlerReset(req: Request, res: Response) {
    if (config.api.platform !== "dev") {
        console.log(config.api.platform);
        throw new UserForbiddenError("Reset is only allow in dev environment.")
    }
    config.api.fileserverHits = 0;
    await reset();
    // write() puts the body on the wire, end() closes the response.
    res.write("Hits reset to 0");
    res.end();
}
