import "dotenv/config";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { query, pool } from "../lib/db.js";

async function seed() {
  const adminUsername = "admin";
  const adminPassword = "admin123";
  const adminEmail = process.env.ADMIN_EMAIL || null;
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const existingUser = await query("SELECT id FROM users WHERE username = $1", [adminUsername]);
  let adminId;

  if (existingUser.rowCount === 0) {
    adminId = crypto.randomUUID();
    await query(
      `INSERT INTO users (id, name, username, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [adminId, "System Administrator", adminUsername, adminEmail, passwordHash, "admin"]
    );
  } else {
    adminId = existingUser.rows[0].id;
    await query(
      `UPDATE users
       SET password_hash = $1,
           role = 'admin',
           permissions = '{"create":true,"updateOwn":true,"viewAll":true,"editAll":true}'::jsonb,
           email = COALESCE($3, email)
       WHERE id = $2`,
      [passwordHash, adminId, adminEmail]
    );
  }

  const existingVehicle = await query("SELECT id FROM vehicles WHERE plate_number = $1", ["KWT-4821"]);
  let vehicleId;

  if (existingVehicle.rowCount === 0) {
    vehicleId = crypto.randomUUID();
    await query(
      `INSERT INTO vehicles (id, name, plate_number, type, driver_name, route_name, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [vehicleId, "Truck 12", "KWT-4821", "Truck", "Ahmed Nasser", "Kuwait City - Jahra", "Active"]
    );
  } else {
    vehicleId = existingVehicle.rows[0].id;
  }

  const existingExpense = await query(
    "SELECT id FROM expenses WHERE vehicle_id = $1 AND type = $2 AND amount = $3",
    [vehicleId, "Fuel", 85.5]
  );

  if (existingExpense.rowCount === 0) {
    await query(
      `INSERT INTO expenses (id, vehicle_id, type, amount, currency, expense_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        crypto.randomUUID(),
        vehicleId,
        "Fuel",
        85.5,
        "KWD",
        new Date().toISOString().slice(0, 10),
        "Initial seeded expense"
      ]
    );
  }

  console.log("Seed completed.");
  console.log("Admin username: admin");
  console.log("Admin password: admin123");
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
