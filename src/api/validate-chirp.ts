import {type Request, type Response} from "express";

export function handlerValidateChirp(req: Request, res: Response) {
    // Initialize a string buffer – this will accumulate the incoming JSON data.
    let body = "";
    // collects incoming request data.
    // Listen for 'data' events – Each time a chunk of data arrives, append it to your string buffer.
    req.on("data", (chunk) => {
    body += chunk;
  });
  // Listen for 'end' events – Once there's no more data coming in, parse your accumulated string as JSON.
  // runs when the request body has been fully received.
  req.on("end", () => {
    try {
      const parsedBody = JSON.parse(body); // converts the JSON string into a JavaScript object.
      const chirp = parsedBody.body;       // extract the body of the javascript object;

      if (typeof chirp !== "string") {
        res.set("Content-Type", "application/json" );
        res.status(400).end(JSON.stringify({ error: "Invalid request body" }));
        return;
      }
      // checks the character limit.
      if (chirp.length > 140) {
        // sets content type.
        res.set("Content-Type", "application/json");
        // sends the HTTP status, the response and finishes the request.
        res.status(400).end(JSON.stringify({ error: "Chirp is too long" }));
        return;
      }
      res.set("Content-Type", "application/json");
      res.status(200).end(JSON.stringify({"valid": true}));
      
    } catch {
      res.set("Content-Type", "application/json");
      res.status(400).end(JSON.stringify({"error": "Something went wrong"}));
    }
  });

}