import { MigrationConfig } from "drizzle-orm/migrator";

type Config = {
  api: APIConfig;
  db: DBConfig;
  jwt: JWTSecret;
};

// In-memory only: a restart resets this to the defaults below.
type APIConfig = {
  fileserverHits: number;
  port: number;
  platform: string;
};

type DBConfig = {
  url: string;
  migrationConfig: MigrationConfig;
};

type JWTSecret = {
  defaultDuration: number;
  issuer: string;
  secret: string;
};

process.loadEnvFile();

function envOrThrow(key: string) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
}


const migrationConfig: MigrationConfig = {
  migrationsFolder: "./src/db/migrations",
};

// One shared instance — every importer gets this same object, not a copy.
export const config: Config = {
  api: {
    fileserverHits: 0,
    port: Number(envOrThrow("PORT")),
    platform: envOrThrow("PLATFORM"),
  },
  db: {
    url: envOrThrow("DB_URL"),
    migrationConfig: migrationConfig,
  },
  jwt: {
    defaultDuration: 60 * 60,
    issuer: "chirpy",
    secret: envOrThrow("JWT_SECRET"),
  }
};

