import { db } from "../index.js";
import { NewChirp, chirps } from "../schema.js";

export async function createChrip(chirp: NewChirp) {
  const [result] = await db
    .insert(chirps)
    .values(chirp)
    .onConflictDoNothing()
    .returning();
  return result;
}