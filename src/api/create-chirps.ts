import { Request, Response } from "express";
import { UserBadRequestError } from "./errors.js";
import { createChrip } from "../db/queries/chirps.js";


export async function handlerChirpsCreate(req: Request, res: Response) {
    type Parameters = {
        body: string;
        userId: string;
    };

    const params: Parameters = req.body;

    if (typeof params.body !== "string") {
          throw new UserBadRequestError("Invalid request body");
        }
        // checks the character limit.
        const maxChirpLength = 140;
        if (params.body.length > maxChirpLength) {
          throw new UserBadRequestError("Chirp is too long. Max length is 140");
        }
    
        const badWords = ["kerfuffle", "sharbert", "fornax"];
        const words = params.body.split(" ");
    
        const cleanedWords = words.map((word) => {
          if (badWords.includes(word.toLowerCase())) {
            return "****";
          }
          return word;
        });
    
        const cleanedBody = cleanedWords.join(" ");

        const chirp = await createChrip({body: cleanedBody, userId: params.userId});

        res.status(201).json({
          id: chirp.id,
          createdAt: chirp.createdAt,
          updatedAt: chirp.updatedAt,
          body: chirp.body,
          userId: chirp.userId
        });
}