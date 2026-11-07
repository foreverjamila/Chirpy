import { db } from "../index.js";
import { NewUser, users } from "../schema.js";
import { eq } from "drizzle-orm";

export async function createUser(user: NewUser) {
  const [result] = await db
    .insert(users)
    .values(user)
    // On a duplicate email, do nothing instead of throwing. The cost is that
    // `result` is then undefined and the caller cannot tell "already exists"
    // from "insert failed" — which is why a repeat signup currently answers
    // 500 rather than 409.
    .onConflictDoNothing()
    // Postgres fills in id/createdAt/updatedAt, so returning() asks for the
    // finished row back; without it we would not know the generated id.
    .returning();
  // returning() always gives an array. Destructuring [result] takes the single
  // row, or undefined when the conflict meant nothing was inserted.
  return result;
}

export async function reset() {
  // Deletes rows, not the table — the schema survives, which is what the reset
  // endpoint's assignment required. Chirps disappear too, via the ON DELETE
  // CASCADE on chirps.users_id, without being named here.
  await db.delete(users);
}

export async function checkUserByEmail(email: string) {
  const rows = await db
  .select()
  .from(users)
  // eq() builds the SQL `where "email" = $1` as a parameter, not string
  // concatenation, so a value containing quotes cannot alter the query.
  .where(eq(users.email, email));

  // Returning undefined rather than throwing: "no such user" is an ordinary
  // outcome for a login attempt, and the caller decides what status it deserves.
  if (rows.length === 0) {
    return;
  }

  return rows[0];
}