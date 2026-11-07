import { UserUnAuthorizedError } from "./errors.js";
import { checkPasswordHash } from "../auth.js";
import { checkUserByEmail } from "../db/queries/users.js";
import { respondWithJSON } from "./json.js";

import type { UserResponse } from "./users.js";
import type { Request, Response } from "express";


export async function handlerLoginUsers(req: Request, res: Response) {
    type Parameters = {
        password: string;
        email: string;
    };

    const params: Parameters = req.body;

    if (!params.email || !params.password) {
        throw new UserUnAuthorizedError("incorrect email or password");
    }

    const user = await checkUserByEmail(params.email);

    if (!user) {
        throw new UserUnAuthorizedError("incorrect email or password");
    }

    const matching = await checkPasswordHash(params.password, user.hashedPassword);

    if (!matching) {
        throw new UserUnAuthorizedError("incorrect email or password");
    }

    respondWithJSON(res, 200, {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    } satisfies UserResponse);
}