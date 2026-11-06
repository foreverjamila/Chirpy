import { asc, eq } from "drizzle-orm";
import { db } from "../index.js";
import { NewChirp, chirps } from "../schema.js";

export async function createChirp(chirp: NewChirp) {
  const [result] = await db
    .insert(chirps)
    .values(chirp)
    .onConflictDoNothing()
    .returning();
  return result;
}

export async function getChirps() {
  const result = await db
    .select()
    .from(chirps)
    .orderBy(asc(chirps.createdAt));
  
    return result;
}

export async function getChirpsById(id: string) {
  const rows = await db
  .select()
  .from(chirps)
  .where(eq(chirps.id, id));

  if (rows.length === 0) {
    return;
  }
  return rows[0];
}