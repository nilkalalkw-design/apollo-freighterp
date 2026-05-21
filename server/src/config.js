const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const port = Number.parseInt(process.env.PORT || "4000", 10);

module.exports = {
  port: Number.isNaN(port) ? 4000 : port,
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL || "",
  allowedOrigin: process.env.ALLOWED_ORIGIN || "*"
};
