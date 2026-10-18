
// In-memory only: a restart resets this to the defaults below.
type APIConfig = {
  fileserverHits: number;
};

// One shared instance — every importer gets this same object, not a copy.
const config: APIConfig = {
    fileserverHits: 0,
};

export default config;
