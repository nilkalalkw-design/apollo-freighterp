import "dotenv/config";
import { pool, query } from "../lib/db.js";

async function migrate() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      username VARCHAR(80) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'staff',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id UUID PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      plate_number VARCHAR(50) NOT NULL UNIQUE,
      type VARCHAR(50) NOT NULL,
      driver_name VARCHAR(120),
      route_name VARCHAR(160),
      status VARCHAR(30) NOT NULL DEFAULT 'Active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id UUID PRIMARY KEY,
      vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      type VARCHAR(80) NOT NULL,
      amount NUMERIC(12, 3) NOT NULL,
      currency VARCHAR(10) NOT NULL,
      expense_date DATE NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{}'::jsonb;
  `);

  await query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email VARCHAR(160);
  `);

  await query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS reset_otp_hash TEXT;
  `);

  await query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS reset_otp_expires_at TIMESTAMPTZ;
  `);

  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
      ON users(LOWER(TRIM(email)))
      WHERE email IS NOT NULL AND TRIM(email) <> '';
  `);

  await query(`
    ALTER TABLE users
      DROP CONSTRAINT IF EXISTS users_role_check;
  `);

  await query(`
    ALTER TABLE users
      ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'staff', 'accountant'));
  `);

  await query(`
    ALTER TABLE vehicles
      DROP CONSTRAINT IF EXISTS vehicles_status_check;
  `);

  await query(`
    ALTER TABLE vehicles
      ADD CONSTRAINT vehicles_status_check CHECK (status IN ('Active', 'In Maintenance', 'Inactive'));
  `);

  await query(`
    ALTER TABLE expenses
      DROP CONSTRAINT IF EXISTS expenses_currency_check;
  `);

  await query(`
    ALTER TABLE expenses
      ADD CONSTRAINT expenses_currency_check CHECK (currency IN ('KWD', 'AED'));
  `);

  await query(`
    ALTER TABLE vehicles
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  `);

  await query(`
    ALTER TABLE expenses
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  `);

  await query(`
    ALTER TABLE expenses
      ADD COLUMN IF NOT EXISTS paid_status VARCHAR(10) NOT NULL DEFAULT 'unpaid'
      CHECK (paid_status IN ('paid', 'unpaid'));
  `);

  await query(`
    ALTER TABLE vehicles
      ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
  `);

  await query(`
    ALTER TABLE expenses
      ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_vehicles_created_by_created_at
      ON vehicles(created_by, created_at DESC);
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_expenses_created_by_created_at
      ON expenses(created_by, created_at DESC);
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS vehicle_history (
      id UUID PRIMARY KEY,
      vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      old_row JSONB NOT NULL,
      new_row JSONB NOT NULL
    );
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_vehicle_history_vehicle_id_changed_at
      ON vehicle_history(vehicle_id, changed_at DESC);
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS expense_history (
      id UUID PRIMARY KEY,
      expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
      changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      old_row JSONB NOT NULL,
      new_row JSONB NOT NULL
    );
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_expense_history_expense_id_changed_at
      ON expense_history(expense_id, changed_at DESC);
  `);

  console.log("Migration completed.");
}

migrate()
  .catch((error) => {
    console.error("Migration failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
