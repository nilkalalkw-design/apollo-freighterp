const { Pool } = require("pg");
const { databaseUrl, nodeEnv } = require("./config");

let pool = null;

function getPool() {
  if (pool) {
    return pool;
  }

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  pool = new Pool({
    connectionString: databaseUrl,
    ssl:
      nodeEnv === "production"
        ? {
            rejectUnauthorized: false
          }
        : false
  });

  return pool;
}

async function query(text, params) {
  return getPool().query(text, params);
}

async function testConnection() {
  const result = await query("select now() as server_time");
  return result.rows[0];
}

module.exports = {
  getPool,
  query,
  testConnection
};
