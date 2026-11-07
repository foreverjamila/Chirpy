import { Request, Response } from "express";
import { checkUserByEmail, createUser } from "../db/queries/users.js";
import { UserBadRequestError, UserNotFoundError, UserUnAuthorizedError } from "./errors.js";
import { checkPasswordHash, hashPassword } from "../auth.js";
import { respondWithJSON } from "./json.js";
import { NewUser } from "../db/schema.js";

export type UserResponse = Omit<NewUser, "hashedPassword">;

export async function handlerUsersCreate(req: Request, res: Response) {
    type parameters = {
        password: string;
        email: string;
    };

    const params: parameters = req.body;

    if (!params.email || !params.password) {
        throw new UserBadRequestError("Missing required fields");
    }

    const hashedPassword = await hashPassword(params.password);

    const user = await createUser({email: params.email, hashedPassword: hashedPassword});

    if (!user) {
        throw new Error("User cannot be created");
    }

    respondWithJSON(res, 201, {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    } satisfies UserResponse);

}
