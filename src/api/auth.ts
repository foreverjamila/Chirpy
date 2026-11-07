import { UserUnAuthorizedError } from "./errors.js";
import { checkPasswordHash, makeJWT } from "../auth.js";
import { checkUserByEmail } from "../db/queries/users.js";
import { respondWithJSON } from "./json.js";

import type { UserResponse } from "./users.js";
import type { Request, Response } from "express";
import { config } from "../config.js";

export type LoginResponse = UserResponse & {
    token: string;
};

export async function handlerLoginUsers(req: Request, res: Response) {
    type Parameters = {
        password: string;
        email: string;
        expiresInSeconds?: number;
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

    // The client may ask for a shorter lifetime but never a longer one: the
    // server decides the ceiling, because a token cannot be revoked once issued
    // and a long-lived one stays valid even after the password changes.
    // The falsy check also covers 0, null and a missing field, all of which mean
    // "no preference" and get the one-hour default.

    let duration = config.jwt.defaultDuration;
    // Take the client's value ONLY when it is present and shorter than the
    // ceiling. Written this way round, the default survives both "not asked
    // for" and "asked for too much" without either needing its own branch —
    // and the && narrows expiresInSeconds to a number, so the assignment
    // type-checks.
    if (params.expiresInSeconds && params.expiresInSeconds < duration) {
        duration = params.expiresInSeconds;
    }

    // Signed with config.jwt.secret, which lives in .env and is never committed.
    // Anyone holding that secret can mint tokens this server will trust, which
    // is why it is the one value in the project that must not reach git.
    const accessToken = makeJWT(user.id, duration, config.jwt.secret);

    // The token is what replaces the password on later requests: the client
    // sends it back as  Authorization: Bearer <token>  and POST /api/chirps
    // reads the user's id out of it rather than trusting a userId in the body.
    respondWithJSON(res, 200, {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        token: accessToken,
    } satisfies LoginResponse);
}