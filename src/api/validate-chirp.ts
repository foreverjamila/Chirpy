import {type Request, type Response} from "express";
import { UserBadRequestError } from "./errors.js";

export async function handlerValidateChirp(req: Request, res: Response) {

  const { body } = req.body;
    
    if (typeof body !== "string") {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }
    // checks the character limit.
    const maxChirpLength = 140;
    if (body.length > maxChirpLength) {
      throw new UserBadRequestError("Chirp is too long. Max length is 140");
    }

    const badWords = ["kerfuffle", "sharbert", "fornax"];
    const words = body.split(" ");

    const cleanedWords = words.map((word) => {
      if (badWords.includes(word.toLowerCase())) {
        return "****";
      }
      return word;
    });

    const cleanedBody = cleanedWords.join(" ");

    res.status(200).json({cleanedBody});

}