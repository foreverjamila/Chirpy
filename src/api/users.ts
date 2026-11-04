import { Request, Response } from "express";
import { createUser } from "../db/queries/users.js";
import { UserBadRequestError } from "./errors.js";

export async function handlerUsersCreate(req: Request, res: Response) {
    type parameters = {
        email: string;
    };

    const params: parameters = req.body;

    if (!params.email) {
        throw new UserBadRequestError("Missing required fields");
    }

    const user = await createUser({email: params.email});

    if (!user) {
        throw new Error("User cannot be created");
    }

    res.status(201).json({
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    });

}