import express from "express";
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import { handlerMetricsReport } from "./api/metrics.js";
import { handlerReadiness } from "./api/readiness.js";
import { handlerReset } from "./api/reset.js";
import { middlewareErrorHandler, middlewareLogResponses, middlewareMetricsInc } from "./api/middleware.js";
import { handlerValidateChirp } from "./api/validate-chirp.js";
import { config } from "./config.js";

const migrationClient = postgres(config.db.url, { max: 1 });
await migrate(drizzle(migrationClient), config.db.migrationConfig);
const app = express();


// No path, and registered first, so it sees every request.
app.use(middlewareLogResponses);

// Runs left to right: count the hit, then serve the file.
app.use("/app", middlewareMetricsInc, express.static("./src/app"));

app.use(express.json());

// Outside /app, so these three don't touch the counter.
app.get("/api/healthz", handlerReadiness);
app.get("/admin/metrics", handlerMetricsReport);
app.post("/admin/reset", handlerReset);
app.post("/api/validate_chirp", handlerValidateChirp);

app.use(middlewareErrorHandler);

app.listen(config.api.port, () => {
    console.log(`Server is running at http://localhost:${config.api.port}`);
});

