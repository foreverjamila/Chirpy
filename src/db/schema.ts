import { pgTable, timestamp, varchar, uuid, text, boolean } from "drizzle-orm/pg-core";


// This file is the single source of truth for the database shape. `npm run
// generate` diffs it against the last snapshot in db/migrations/meta and writes
// the SQL to get from one to the other — so the schema is edited here, never by
// hand-writing a migration or by altering the live database directly.
//
// In every column below, the JS property name is what our code uses and the
// string argument is the real column name in Postgres. That is the camelCase /
// snake_case translation layer: `userId` in TypeScript is `users_id` in SQL.

export const users = pgTable("users", {
  // defaultRandom() means Postgres generates the uuid, so an insert never has
  // to supply an id and two concurrent inserts cannot collide.
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    // $onUpdate is drizzle-side, not a database trigger: drizzle sets this
    // whenever IT performs an update. A hand-written SQL UPDATE bypasses it.
    .$onUpdate(() => new Date()),
  // unique() is enforced by Postgres, which is what makes "one account per
  // email" true even if two requests arrive at the same instant.
  email: varchar("email", { length: 256 }).unique().notNull(),
  // The default exists only for rows that predate this column. Without it,
  // adding a NOT NULL column to a table that already has rows fails outright —
  // Postgres would have no value to put in them.
  hashedPassword: varchar("hashed_password").notNull().default("unset"),
  // NOT NULL plus a DEFAULT, for the same reason hashedPassword above needed
  // one: the table already had rows when this column was added, and Postgres
  // must have something to put in them. false is the honest default — nobody is
  // a paying member until Polka says so.
  isChirpyRed: boolean("is_chirpy_red").notNull().default(false),
});

export const chirps = pgTable("chirps", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  // text() has no length cap, unlike varchar. The 140-character limit is an
  // application rule enforced in the handler, not a database one.
  body: text("body").notNull(),
  userId: uuid("users_id")
  // The foreign key: Postgres refuses to store a chirp whose user does not
  // exist. onDelete cascade answers "what happens to someone's chirps when the
  // user is deleted?" — the chirps go too, automatically. That is why
  // `db.delete(users)` in the reset query wipes chirps without mentioning them.
  .references(() => users.id, { onDelete: "cascade" })
  .notNull(),
})

export const refreshTokens = pgTable("refresh_tokens", {
  // The token IS the key here — there is no separate id, because every lookup
  // arrives as "here is my refresh token, whose is it?". primaryKey() also
  // makes the column NOT NULL and unique, which is what stops two users from
  // ever being handed the same token.
  token: varchar("token", {length: 256}).primaryKey(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  userId: uuid("user_id")
  .references(() => users.id, { onDelete: "cascade"})
  .notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
})

// $inferInsert derives the type for INSERTING a row, so columns with defaults
// (id, createdAt, updatedAt) come out optional — the database fills those in.
// Note that makes these types a loose fit for describing a RESPONSE; the select
// side is `typeof users.$inferSelect`, where all columns are required.
export type NewUser = typeof users.$inferInsert;
export type NewChirp = typeof chirps.$inferInsert;
export type NewToken = typeof refreshTokens.$inferInsert;