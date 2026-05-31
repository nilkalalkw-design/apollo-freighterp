const path = require("path");
const dotenv = require("dotenv");

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

module.exports = {
  port: Number.isNaN(port) ? 4000 : port,
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: databaseUrlValue,
  databaseUrlSource: databaseConfig?.[0] || "",
  databaseHost,
  isNeonDatabase,
  allowedOrigin: process.env.ALLOWED_ORIGIN || defaultAllowedOrigin,
  allowedOrigins,
  autoMigrate: process.env.AUTO_MIGRATE !== "false"
};
