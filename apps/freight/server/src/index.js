import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health.js";
import { vehiclesRouter } from "./routes/vehicles.js";
import { expensesRouter } from "./routes/expenses.js";
import { usersRouter } from "./routes/users.js";
import { authRouter } from "./routes/auth.js";
import { query } from "./lib/db.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDistPath = path.resolve(__dirname, "../../client/dist");
const defaultAllowedOrigins = [
  "http://localhost:5173",
  "https://apollo-freight-client.vercel.app",
  "https://apollo-freight-pst1.onrender.com"
];
const allowedOrigins = (process.env.APP_ORIGIN || defaultAllowedOrigins.join(","))
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedVercelPreviewPattern =
  /^https:\/\/apollo-freight-client(?:-[a-z0-9-]+)?-nilkalalkw-designs-projects\.vercel\.app$/;

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || allowedVercelPreviewPattern.test(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    }
  })
);
app.use(express.json());

const hasClientBuild = fs.existsSync(path.join(clientDistPath, "index.html"));

if (process.env.NODE_ENV === "production" && hasClientBuild) {
  app.use(express.static(clientDistPath));
}

app.get("/", (_req, res) => {
  res.json({
    name: "Apollo-Freight Solutions API",
    status: "ok"
  });
});

app.get("/api/db-check", async (_req, res) => {
  try {
    const result = await query("SELECT NOW() AS now");
    res.json({
      status: "connected",
      databaseTime: result.rows[0].now
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/vehicles", vehiclesRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/users", usersRouter);

if (process.env.NODE_ENV === "production" && hasClientBuild) {
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
}

app.listen(port, () => {
  console.log(`Apollo Freight API running on port ${port}`);
});
