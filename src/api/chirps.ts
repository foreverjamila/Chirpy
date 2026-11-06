import { Request, Response } from "express";
import { UserBadRequestError, UserNotFoundError } from "./errors.js";
import { createChirp, getChirps, getChirpsById } from "../db/queries/chirps.js";
import { respondWithJSON } from "./json.js";



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

        const chirp = await createChirp({body: cleanedBody, userId: params.userId});

        respondWithJSON(res, 201, chirp);
}

export async function handlerChirpsGet(req: Request, res: Response) {
  const allChirps = await getChirps();
  const response = allChirps.map((chirp) => ({
    id: chirp.id,
    createdAt: chirp.createdAt,
    updatedAt: chirp.updatedAt,
    body: chirp.body,
    userId: chirp.userId,
  }));

  respondWithJSON(res, 200, response);
}

export async function handlerRetrieveChirpsById(req: Request, res: Response) {
  const {chirpId} = req.params;

  if (typeof chirpId !== "string") {
    throw new UserBadRequestError("Invalid chirp ID");
  }

  const chirp = await getChirpsById(chirpId);

  if (!chirp) {
    throw new UserNotFoundError(`Chirp with chirpId: ${chirpId} not found`);
  }

  respondWithJSON(res, 200, chirp);
}