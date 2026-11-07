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

    // All three failures below throw the SAME error with the SAME message, on
    // purpose. A missing field, an unknown email and a wrong password are
    // indistinguishable from outside, because telling them apart would let
    // someone discover which email addresses have accounts one guess at a time.
    // That is also why this is 401 and not 400 or 404.
    if (!params.email || !params.password) {
        throw new UserUnAuthorizedError("incorrect email or password");
    }

    const user = await checkUserByEmail(params.email);

    if (!user) {
        throw new UserUnAuthorizedError("incorrect email or password");
    }

    // checkPasswordHash returns false rather than throwing, even when the
    // stored hash is unusable (e.g. the "unset" default), so an unparseable
    // hash authenticates nobody instead of producing a 500.
    const matching = await checkPasswordHash(params.password, user.hashedPassword);

    if (!matching) {
        throw new UserUnAuthorizedError("incorrect email or password");
    }

    // Proof of identity ends here: no token is issued yet, so the very next
    // request from this client is anonymous again. Tokens come in a later lesson.
    respondWithJSON(res, 200, {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    } satisfies UserResponse);
}