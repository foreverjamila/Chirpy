import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";


import * as schema from "./schema.js";
import {config} from "../config.js";

// Created once, at module load. Node caches modules, so every file that imports
// `db` shares this one connection pool rather than opening its own — opening a
// pool per request would exhaust Postgres' connection limit under load.
const conn = postgres(config.db.url);

// Passing { schema } is what makes queries typed: drizzle knows the columns of
// every table here, so `db.select().from(chirps)` returns a properly typed row
// and a misspelled column fails to compile instead of failing at runtime.
export const db = drizzle(conn, { schema });
