import {type Request, type Response} from "express";

export async function handlerValidateChirp(req: Request, res: Response) {

  const { body } = req.body;
    
    if (typeof body !== "string") {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }
    // checks the character limit.
    if (body.length > 140) {
      throw new Error("Chirp is too long");
    }

    const profaneWords = ["kerfuffle", "sharbert", "fornax"];
    const words = body.split(" ");

    const cleanedWords = words.map((word) => {
      if (profaneWords.includes(word.toLowerCase())) {
        return "****";
      }
      return word;
    });

    const cleanedBody = cleanedWords.join(" ");

    res.status(200).json({cleanedBody});

}