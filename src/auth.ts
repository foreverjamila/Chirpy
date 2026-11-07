import * as argon2 from "argon2";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import { UserBadRequestError, UserUnAuthorizedError } from "./api/errors.js";
import { Request } from "express";
import { config } from "./config.js";

// The issuer now lives in config.jwt.issuer, so makeJWT and validateJWT read
// the same value and cannot drift apart by one typo.

export async function hashPassword(password: string): Promise<string> {
    // argon2.hash picks a random salt itself and writes it, the variant and the
    // cost settings into the returned string, which is why the result is ~97
    // characters and why nothing extra needs storing alongside it.
    const hash = await argon2.hash(password);
    return hash;
}

export async function checkPasswordHash(password: string, hash: string): Promise<boolean> {
    // argon2.verify throws on an empty password rather than returning false,
    // so stop here: no password can never be the right password.
    if (!password) return false;
    try {
        return await argon2.verify(hash, password);
    } catch {
        // A stored hash argon2 cannot parse — "unset", or anything else
        // unusable — must never authenticate anyone. The assignment asks
        // for 401 when the comparison errors, so a failed comparison is
        // reported as "does not match" rather than thrown.
        return false;
    }
}

// JwtPayload permits any key, so a typo like `isr:` would compile and silently
// produce a claim nobody reads. Pick narrows it to the four claims we set:
//   iss = issuer (who made it), sub = subject (which user it is about),
//   iat = issued at,            exp = expires at.
export type payload = Pick<JwtPayload, "iss" | "sub" | "iat" | "exp">;


export function makeJWT(userID: string, expiresIn: number, secret: string): string {
    // JWT timestamps are SECONDS since the epoch; Date.now() gives milliseconds.
    // Forgetting the / 1000 produces a token that expires ~50,000 years from now
    // and nothing complains, because exp is just a number to the library.
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiredAt = issuedAt + expiresIn;

    const token: payload = {
        iss: config.jwt.issuer,
        sub: userID,
        iat: issuedAt,
        exp: expiredAt,
    };

    // Signed, NOT encrypted. Anyone holding this string can decode and read the
    // payload above without the secret; the signature only proves nobody altered
    // it. So never put anything secret in here.
    return jwt.sign(token, secret, {algorithm: "HS256"});

}

export function validateJWT(tokenString: string, secret: string): string {
    let decoded: JwtPayload;

    try {
        // verify does two jobs at once: it recomputes the signature with our
        // secret, and it compares exp against the clock. A tampered token, one
        // signed with a different secret, and an expired one all throw from
        // here — which is why they all become the same error below.
        decoded = jwt.verify(tokenString, secret) as JwtPayload;
    } catch(e) {
        // Deliberately one message for every failure. Telling a caller *which*
        // way their token was bad helps an attacker more than it helps a user.
        throw new UserUnAuthorizedError("Invalid Token");
    }

    // Past this point the signature is valid, so the claims came from us.
    // These two checks guard against a token we signed that is missing fields
    // — e.g. one minted by older code — not against forgery.
    if (decoded.iss !== config.jwt.issuer) {
        throw new UserUnAuthorizedError("Invalid Issuer");
    }

    if (!decoded.sub) {
        throw new UserUnAuthorizedError("UserId not in Token");
    }

    // sub is the user's id. Callers get just that string, so nothing outside
    // this file needs to know a JWT was involved.
    return decoded.sub;
}


// Clients authenticate by sending  Authorization: Bearer <token>.  This pulls
// the token out of that header value. "Bearer" is the scheme — the word that
// says HOW to read the credential — and it is not part of the token itself.
//
// The parameter accepts undefined because that is what Express gives us when
// the header is absent (req.get("Authorization")), and a missing header is a
// bad request, not a crash.
export function extractBearerToken(authorization: string | undefined): string {
    if (!authorization) {
        throw new UserBadRequestError("Malformed authorization header");
    }

    // trim() first, so a header padded with spaces still parses: without it
    // "  Bearer x  " splits into ["", "", "Bearer", "x", "", ""] and the scheme
    // check fails on the leading empty string.
    const splitAuth = authorization.trim().split(" ");

    if (splitAuth.length < 2 || splitAuth[0] !== "Bearer") {
        throw new UserBadRequestError("Malformed authorization header");
    }

    // "Bearer " passes the length and scheme checks above but carries no
    // credential, so it has to be rejected here rather than returned as "".
    const token = splitAuth[1].trim();

    if (!token) {
        throw new UserBadRequestError("Malformed authorization header");
    }

    // One message for every failure, as elsewhere in this file: a caller
    // learning exactly which part of their header was wrong is of more use to
    // someone probing the API than to someone using it.
    return token;
}

export function getBearerToken(req: Request): string {
    const authHeader = req.get("Authorization");

    if (!authHeader) {
        throw new UserUnAuthorizedError("Malformed authorization header");

    }

    const bearerToken = extractBearerToken(authHeader);

    return bearerToken;
}