import { Request, Response } from "express";
import { checkUserByEmail, createUser } from "../db/queries/users.js";
import { UserBadRequestError, UserNotFoundError, UserUnAuthorizedError } from "./errors.js";
import { checkPasswordHash, hashPassword } from "../auth.js";
import { respondWithJSON } from "./json.js";
import { NewUser } from "../db/schema.js";

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
    } satisfies UserResponse);

}
