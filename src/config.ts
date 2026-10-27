
// In-memory only: a restart resets this to the defaults below.
type APIConfig = {
  fileserverHits: number;
  dbURL: string;
};

process.loadEnvFile();

function envOrThrow(key: string) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
}

// One shared instance — every importer gets this same object, not a copy.
const config: APIConfig = {
    fileserverHits: 0,
    dbURL: envOrThrow("DB_URL"),
};

export default config;
