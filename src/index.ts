import express from "express";
import { handlerMetricsReport } from "./api/metrics.js";
import { handlerReadiness } from "./api/readiness.js";
import { handlerReset } from "./api/reset.js";
import { middlewareErrorHandler, middlewareLogResponses, middlewareMetricsInc } from "./api/middleware.js";
import { handlerValidateChirp } from "./api/validate-chirp.js";

const app = express();
const PORT = 8080;

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

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});

