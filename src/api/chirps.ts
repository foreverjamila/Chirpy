import { Request, Response } from "express";
import { UserBadRequestError, UserNotFoundError } from "./errors.js";
import { createChirp, getChirps, getChirpsById } from "../db/queries/chirps.js";
import { respondWithJSON } from "./json.js";
import { getBearerToken, validateJWT } from "../auth.js";
import { config } from "../config.js";


export async function handlerChirpsCreate(req: Request, res: Response) {
    type Parameters = {
        body: string;
    };

    const token = getBearerToken(req);
    
    const valid = validateJWT(token, config.jwt.secret);

    const params: Parameters = req.body;

    // A real check, not a type annotation: req.body could be anything, so this
    // catches {"body": 123} before it reaches .length below.
    if (typeof params.body !== "string") {
          throw new UserBadRequestError("Invalid request body");
        }
        // checks the character limit. Both guards run BEFORE createChirp, so an
        // over-long or non-string body is rejected without touching the
        // database. Note nothing here checks userId — a userId that does not
        // exist is caught by the foreign key instead, which throws and surfaces
        // as a 500 rather than a 400.
        const maxChirpLength = 140;
        if (params.body.length > maxChirpLength) {
          throw new UserBadRequestError("Chirp is too long. Max length is 140");
        }

        const badWords = ["kerfuffle", "sharbert", "fornax"];
        // split(" ") splits on one literal space, so a word separated by a tab
        // or newline stays joined to its neighbour and is not filtered. The
        // assignment defines a word as a space-delimited token, so this matches
        // the spec exactly — a regex would model a different definition.
        const words = params.body.split(" ");

        const cleanedWords = words.map((word) => {
          // toLowerCase() on the comparison only: the replacement is all-or-
          // nothing, so "Sharbert" is caught but "Sharbert!" is not — the
          // punctuation makes it a different token.
          if (badWords.includes(word.toLowerCase())) {
            return "****";
          }
          return word;
        });

        const cleanedBody = cleanedWords.join(" ");

        // The cleaned body is what gets stored, not the original. There is no
        // record of what the user actually typed.
        const chirp = await createChirp({body: cleanedBody, userId: valid});

        // Sending the row straight through works because the schema's property
        // names are already camelCase (id, createdAt, updatedAt, body, userId),
        // and chirps have no column we need to hide — unlike users.
        respondWithJSON(res, 201, {
          id: chirp.id,
          body: chirp.body,
          createdAt: chirp.createdAt,
          updatedAt: chirp.updatedAt,
          userId: chirp.userId,
        });
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