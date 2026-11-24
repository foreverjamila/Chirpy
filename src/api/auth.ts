import { UserUnAuthorizedError } from "./errors.js";
import { checkPasswordHash, getBearerToken, makeJWT, makeRefreshToken } from "../auth.js";
import { checkUserByEmail } from "../db/queries/users.js";
import { respondWithJSON } from "./json.js";

import type { UserResponse } from "./users.js";
import type { Request, Response } from "express";
import { config } from "../config.js";
import { revokeRefreshToken, saveRefreshToken, userForRefreshToken } from "../db/queries/refresh.js";

export type LoginResponse = UserResponse & {
    token: string;
    refreshToken: string;
};

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


    // One hour, fixed: the client no longer gets to ask for a lifetime. A JWT
    // cannot be revoked once signed, so the only protection against a leaked one
    // is that it stops working soon. The refresh token below is what keeps the
    // user logged in past that hour, and unlike the JWT it CAN be revoked,
    // because it has a row in the database.
    // Signed with config.jwt.secret, which lives in .env and is never committed.
    // Anyone holding that secret can mint tokens this server will trust, which
    // is why it is the one value in the project that must not reach git.
    const accessToken = makeJWT(user.id, config.jwt.defaultDuration, config.jwt.secret);

    const refreshToken = makeRefreshToken();

    const saved = await saveRefreshToken(user.id, refreshToken);

    if (!saved) {
        throw new UserUnAuthorizedError("Cannot save refresh token");
    }

    // The token is what replaces the password on later requests: the client
    // sends it back as  Authorization: Bearer <token>  and POST /api/chirps
    // reads the user's id out of it rather than trusting a userId in the body.
    respondWithJSON(res, 200, {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        token: accessToken,
        refreshToken: refreshToken,
        isChirpyRed: user.isChirpyRed,
    } satisfies LoginResponse);
}

export async function handlerRefresh(req: Request, res: Response) {
    let refreshtoken = getBearerToken(req);
    const result = await userForRefreshToken(refreshtoken);

    if (!result) {
        throw new UserUnAuthorizedError("Invalid refresh Token");
    }
    
    const user = result.user;
    const newAccessToken = makeJWT(
        user.id,
        config.jwt.defaultDuration,
        config.jwt.secret
    );

    type response = {
        token: string;
    };

    respondWithJSON(res, 200, {
        token: newAccessToken
    });
}

export async function handlerRevoke(req: Request, res: Response) {
    let refreshToken = getBearerToken(req);
    await revokeRefreshToken(refreshToken);
    res.status(204).send();
}