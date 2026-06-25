import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { query } from "../lib/db.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

export const usersRouter = Router();

usersRouter.get("/", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const result = await query(
      `SELECT id, name, username, email, role, created_at, permissions
       FROM users
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

usersRouter.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const username = String(req.body.username || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const role = req.body.role || "staff";
    const permissions = req.body.permissions || {};

    if (!name || !username || !email || !password) {
      return res.status(400).json({ message: "Name, username, email, and password are required." });
    }

    const id = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (id, name, username, email, password_hash, role, permissions)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, username, email, role, created_at, permissions`,
      [id, name, username, email, passwordHash, role, permissions]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

usersRouter.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const name = String(req.body.name || "").trim();
    const username = String(req.body.username || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const role = req.body.role || "staff";
    const permissions = req.body.permissions || {};

    if (!name || !username || !email) {
      return res.status(400).json({ message: "Name, username, and email are required." });
    }

    const result = await query(
      `UPDATE users
       SET name = $2,
           username = $3,
           email = $4,
           role = $5,
           permissions = $6
       WHERE id = $1
       RETURNING id, name, username, email, role, created_at, permissions`,
      [id, name, username, email, role, permissions]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

usersRouter.put("/:id/password", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const password = String(req.body.password || "");
    if (!password) {
      return res.status(400).json({ message: "Password is required." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await query(
      `UPDATE users
       SET password_hash = $2
       WHERE id = $1
       RETURNING id, name, username, email, role, created_at`,
      [id, passwordHash]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

usersRouter.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query("DELETE FROM users WHERE id = $1 RETURNING id", [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({ message: "User deleted successfully." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});
