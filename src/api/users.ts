import { Request, Response } from "express";
import { checkUserByEmail, createUser, updateUser, upgradeChirpyRed } from "../db/queries/users.js";
import { UserBadRequestError, UserNotFoundError, UserUnAuthorizedError } from "./errors.js";
import { checkPasswordHash, getBearerToken, hashPassword, validateJWT } from "../auth.js";
import { respondWithJSON } from "./json.js";
import { NewUser } from "../db/schema.js";
import { config } from "../config.js";


// The safe shape of a user to send over the wire: every column except the
// password hash. Deriving it with Omit rather than writing the fields out means
// a new column added to the schema appears here automatically, and the hash
// can only ever be exposed by deliberately editing this line.
export type UserResponse = Omit<NewUser, "hashedPassword">;

export async function handlerUsersCreate(req: Request, res: Response) {
    // req.body is whatever JSON the client sent — this type describes what we
    // HOPE is there, it does not check it. TypeScript types vanish at runtime,
    // so the guard below is the thing actually doing the validating.
    type parameters = {
        password: string;
        email: string;
    };

    const params: parameters = req.body;

    if (!params.email || !params.password) {
        throw new UserBadRequestError("Missing required fields");
    }

    // Hash before the insert, so the plaintext never reaches the database even
    // momentarily and never appears in a query log.
    const hashedPassword = await hashPassword(params.password);

    const user = await createUser({email: params.email, hashedPassword: hashedPassword});

    // undefined means onConflictDoNothing swallowed a duplicate email. A plain
    // Error maps to 500; a 409 Conflict would be the honest answer here.
    if (!user) {
        throw new Error("User cannot be created");
    }

    // Fields listed explicitly rather than spreading `user`: a spread would
    // include hashedPassword and leak it. `satisfies` checks the object fits
    // UserResponse while keeping its exact literal type.
    respondWithJSON(res, 201, {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        isChirpyRed: user.isChirpyRed,
    } satisfies UserResponse);

}

// PUT /api/users — a user changes their OWN email and password.
//
// This is the authorization lesson in one function: the id of the row to update
// comes out of the TOKEN, never out of the request body. If the handler read an
// id from the body instead, anyone could paste a stranger's id and take over
// that account, because the body is written by the client and the token is not.
// There is deliberately no "which user?" parameter for a caller to tamper with.
export async function handlerUsersUpdate(req: Request, res: Response) {
    type Parameter = {
        email: string;
        password: string;
    };

    // Token first, before the body is even looked at: an unauthenticated caller
    // gets 401 without the server spending time hashing their password. Both
    // calls throw UserUnAuthorizedError, so a missing, malformed, expired or
    // forged token all answer 401 as the assignment requires.
    const token = getBearerToken(req);
    const userId = validateJWT(token, config.jwt.secret);

    const params: Parameter = req.body;

    // Both fields are required — this is a full replacement, not a patch. A
    // request with only an email would otherwise reach hashPassword(undefined)
    // and crash into a 500.
    if (!params.email || !params.password) {
        throw new UserBadRequestError("Missing required fields");
    }

    // Hashed here, so the new plaintext never reaches the database or a query log.
    const hashedPassword = await hashPassword(params.password);

    const user = await updateUser(userId, params.email, hashedPassword);

    // Same four fields as the create handler, for the same reason: listing them
    // out rather than spreading `user` is what keeps hashedPassword off the
    // wire, and `satisfies UserResponse` makes the compiler check the shape.
    respondWithJSON(res, 200, {
        id: user.id,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        email: user.email,
        isChirpyRed: user.isChirpyRed,
    } satisfies UserResponse);
}

