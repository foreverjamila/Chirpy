import * as argon2 from "argon2";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import { UserUnAuthorizedError } from "./api/errors.js";

// Who issues our tokens. A constant so signing and any future issuer check
// cannot drift apart by one typo.
const TOKEN_ISSUER = "chirpy";


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
        iss: TOKEN_ISSUER,
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
    if (!decoded.iss) {
        throw new UserUnAuthorizedError("Invalid Issuer");
    }

    if (!decoded.sub) {
        throw new UserUnAuthorizedError("UserId not in Token");
    }

    // sub is the user's id. Callers get just that string, so nothing outside
    // this file needs to know a JWT was involved.
    return decoded.sub;
}

