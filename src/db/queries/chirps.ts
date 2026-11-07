import { asc, eq } from "drizzle-orm";
import { db } from "../index.js";
import { NewChirp, chirps } from "../schema.js";

export async function createChirp(chirp: NewChirp) {
  const [result] = await db
    .insert(chirps)
    .values(chirp)
    // Kept for symmetry with createUser, though chirps have no unique column
    // for anything to conflict on, so this can never actually trigger. A bad
    // userId fails the foreign key instead, which throws rather than conflicts.
    .onConflictDoNothing()
    .returning();
  return result;
}

export async function getChirps() {
  const result = await db
    .select()
    .from(chirps)
    // Explicit ordering matters: without ORDER BY, Postgres makes no promise
    // about row order, and "it came back sorted" during testing is luck, not
    // a guarantee.
    .orderBy(asc(chirps.createdAt));

    return result;
}

export async function getChirpsById(id: string) {
  const rows = await db
  .select()
  .from(chirps)
  .where(eq(chirps.id, id));

  // Known rough edge: if `id` is not a valid uuid, this never gets here —
  // Postgres rejects the value while parsing it (SQLSTATE 22P02) and the throw
  // surfaces as a 500 instead of a 404.
  if (rows.length === 0) {
    return;
  }
  return rows[0];
}