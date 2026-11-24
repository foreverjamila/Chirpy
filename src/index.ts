import express from "express";
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import { handlerMetricsReport } from "./api/metrics.js";
import { handlerReadiness } from "./api/readiness.js";
import { handlerReset } from "./api/reset.js";
import { middlewareErrorHandler, middlewareLogResponses, middlewareMetricsInc } from "./api/middleware.js";
import { config } from "./config.js";
import { handlerUsersCreate, handlerUsersUpdate } from "./api/users.js";
import { handlerLoginUsers, handlerRefresh, handlerRevoke } from "./api/auth.js";
import { handlerWebhook } from "./api/webhooks.js";
import { handlerChirpsCreate, handlerChirpsDeleteById, handlerChirpsGet, handlerRetrieveChirpsById } from "./api/chirps.js";

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

app.post("/api/login", (req, res, next) => {
  Promise.resolve(handlerLoginUsers(req, res)).catch(next);
})

app.get("/api/chirps", (req, res, next) => {
  Promise.resolve(handlerChirpsGet(req, res)).catch(next);
});

app.get("/api/chirps/:chirpId", (req, res, next) => {
  Promise.resolve(handlerRetrieveChirpsById(req, res)).catch(next);
});

app.post("/api/refresh", (req, res, next) => {
  Promise.resolve(handlerRefresh(req, res)).catch(next);
});

app.post("/api/revoke", (req, res, next) => {
  Promise.resolve(handlerRevoke(req, res)).catch(next);
});

app.put("/api/users", (req, res, next) => {
  Promise.resolve(handlerUsersUpdate(req, res)).catch(next);
});

app.delete("/api/chirps/:chirpId", (req, res, next) => {
  Promise.resolve(handlerChirpsDeleteById(req, res)).catch(next);
});

app.post("/api/polka/webhooks", (req, res, next) => {
  Promise.resolve(handlerWebhook(req, res)).catch(next);
});

app.use(middlewareErrorHandler);

app.listen(config.api.port, () => {
    console.log(`Server is running at http://localhost:${config.api.port}`);
});

