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
import { handlerUsersCreate } from "./api/users.js";
import { handlerChirpsCreate } from "./api/create-chirps.js";

const migrationClient = postgres(config.db.url, { max: 1 });
await migrate(drizzle(migrationClient), config.db.migrationConfig);
const app = express();


// No path, and registered first, so it sees every request.
app.use(middlewareLogResponses);

// Runs left to right: count the hit, then serve the file.
app.use("/app", middlewareMetricsInc, express.static("./src/app"));

app.use(express.json());

// Outside /app, so these three don't touch the counter.
app.get("/api/healthz", (req, res, next) => {
  Promise.resolve(handlerReadiness(req, res)).catch(next);
});

app.get("/admin/metrics", (req, res, next) => {
  Promise.resolve(handlerMetricsReport(req, res)).catch(next);
});

app.post("/admin/reset", (req, res, next) => {
  Promise.resolve(handlerReset(req, res)).catch(next);
});

app.post("/api/chirps", (req, res, next) => {
  Promise.resolve(handlerChirpsCreate(req, res)).catch(next);
});

app.post("/api/users", (req, res, next) => {
  Promise.resolve(handlerUsersCreate(req, res)).catch(next);
});

app.use(middlewareErrorHandler);

app.listen(config.api.port, () => {
    console.log(`Server is running at http://localhost:${config.api.port}`);
});

