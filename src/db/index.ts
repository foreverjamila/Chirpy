import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema.js";
import { config };

const conn = postgres(config.dbURL);
export const db = drizzle(conn, { schema });