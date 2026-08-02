const path = require("path");
const dotenv = require("dotenv");
const crypto = require("crypto");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const port = Number.parseInt(process.env.PORT || "4000", 10);
const defaultAllowedOrigin = (process.env.NODE_ENV || "development") === "production" ? "https://apollo-freighterp.vercel.app" : "*";
const databaseSources = [
  ["NEON_DATABASE_URL", process.env.NEON_DATABASE_URL],
  ["DATABASE_URL", process.env.DATABASE_URL],
  ["POSTGRES_URL", process.env.POSTGRES_URL],
  ["POSTGRESQL_URL", process.env.POSTGRESQL_URL],
  ["PG_CONNECTION_STRING", process.env.PG_CONNECTION_STRING],
  ["RENDER_DATABASE_URL", process.env.RENDER_DATABASE_URL]
];
const databaseConfig = databaseSources.find(([, value]) => typeof value === "string" && value.trim());
const databaseUrlValue = databaseConfig?.[1]?.trim() || "";
const databaseHost = (() => {
  try {
    return databaseUrlValue ? new URL(databaseUrlValue).hostname : "";
  } catch {
    return "";
  }
})();
const isNeonDatabase = databaseHost.includes("neon.tech");
const allowedOrigins = (process.env.ALLOWED_ORIGIN || defaultAllowedOrigin)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const configuredSecret = process.env.CUSTOMER_PORTAL_SECRET || process.env.SESSION_SECRET || process.env.API_SECRET || "";
if (!configuredSecret) {
  console.warn(
    "WARNING: No CUSTOMER_PORTAL_SECRET/SESSION_SECRET/API_SECRET set. Generating a random secret for this run. " +
    "Existing login sessions and tokens will be invalidated on every restart until you set one of these environment variables."
  );
}
// Falls back to a secret generated fresh for this process (never a fixed, guessable value) so the
// server always starts and works even without the env var set - it just won't persist across restarts.
const customerPortalSecret = configuredSecret || crypto.randomBytes(32).toString("hex");

module.exports = {
  port: Number.isNaN(port) ? 4000 : port,
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: databaseUrlValue,
  databaseUrlSource: databaseConfig?.[0] || "",
  databaseHost,
  isNeonDatabase,
  allowedOrigins,
  customerPortalSecret,
  autoMigrate: process.env.AUTO_MIGRATE !== "false"
};
