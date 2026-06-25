import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../lib/db.js";
import { sendPasswordResetOtp } from "../lib/mailer.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

authRouter.post("/login", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    if (!username || !password) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    const result = await query(
      `SELECT id, name, username, password_hash, role, created_at, permissions
       FROM users
       WHERE LOWER(TRIM(username)) = LOWER($1)`,
      [username]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    const user = result.rows[0];
    const passwordOk = await bcrypt.compare(password, user.password_hash);

    if (!passwordOk) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    const permissions = user.permissions || {};
    const token = jwt.sign(
      {
        sub: user.id,
        id: user.id,
        username: user.username,
        role: user.role,
        permissions
      },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    return res.json({
      token,
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      permissions,
      created_at: user.created_at
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

authRouter.post("/forgot-password", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const result = await query(
      `SELECT id, name, email
       FROM users
       WHERE LOWER(TRIM(email)) = LOWER($1)`,
      [email]
    );

    if (result.rowCount === 0) {
      return res.json({ message: "If the email is registered, an OTP will be sent to it." });
    }

    const user = result.rows[0];
    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    await query(
      `UPDATE users
       SET reset_otp_hash = $2,
           reset_otp_expires_at = NOW() + INTERVAL '15 minutes'
       WHERE id = $1`,
      [user.id, otpHash]
    );

    await sendPasswordResetOtp({ to: user.email, name: user.name, otp });
    return res.json({ message: "If the email is registered, an OTP will be sent to it." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

authRouter.post("/reset-password", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const otp = String(req.body.otp || "").trim();
    const password = String(req.body.password || "");

    if (!email || !otp || !password) {
      return res.status(400).json({ message: "Email, OTP, and new password are required." });
    }

    const result = await query(
      `SELECT id, reset_otp_hash, reset_otp_expires_at
       FROM users
       WHERE LOWER(TRIM(email)) = LOWER($1)`,
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    const user = result.rows[0];
    const expiresAt = user.reset_otp_expires_at ? new Date(user.reset_otp_expires_at).getTime() : 0;
    if (!user.reset_otp_hash || expiresAt < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    const otpOk = await bcrypt.compare(otp, user.reset_otp_hash);
    if (!otpOk) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await query(
      `UPDATE users
       SET password_hash = $2,
           reset_otp_hash = NULL,
           reset_otp_expires_at = NULL
       WHERE id = $1`,
      [user.id, passwordHash]
    );

    return res.json({ message: "Password reset successfully. Please login with your new password." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

authRouter.get("/me", requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, username, email, role, created_at, permissions
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );
    if (result.rowCount === 0) return res.status(401).json({ message: "Unauthorized." });
    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});
