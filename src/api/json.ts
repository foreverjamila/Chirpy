import type { Response } from "express";

// Two helpers so every handler sends JSON the same way. Without them each
// handler repeats the content type, the serialisation and the status call, and
// they drift apart — one forgets the header, another nests the error differently.

// Keeps one shape for every error body: { "error": "..." }. A client can then
// read err.error without caring which endpoint failed.
export function respondWithError(res: Response, code: number, message: string) {
  respondWithJSON(res, code, { error: message });
}

export function respondWithJSON(res: Response, code: number, payload: any) {
  res.header("Content-Type", "application/json");
  // Serialising by hand and using send() rather than res.json() — same result,
  // but it makes the two steps visible. Note JSON.stringify turns a Date into
  // an ISO-8601 string, which is why timestamps come out as
  // "2026-11-07T14:03:25.813Z" without any formatting code.
  const body = JSON.stringify(payload);
  res.status(code).send(body);
}