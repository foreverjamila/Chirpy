import { db } from "../index.js";
import { NewUser, users } from "../schema.js";
import { eq } from "drizzle-orm";

export async function createUser(user: NewUser) {
  const [result] = await db
    .insert(users)
    .values(user)
    .onConflictDoNothing()
    .returning();
  return result;
}

export async function reset() {
  await db.delete(users);
}

export async function checkUserByEmail(email: string) {
  const rows = await db
  .select()
  .from(users)
  .where(eq(users.email, email));

  if (rows.length === 0) {
    return;
  }

  return rows[0];
}