import nodemailer from "nodemailer";

export function isEmailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendPasswordResetOtp({ to, name, otp }) {
  if (!isEmailConfigured()) {
    throw new Error("Email sending is not configured.");
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: "Apollo-Freight Solutions password reset OTP",
    text: `Hello ${name || "User"},\n\nYour Apollo-Freight Solutions password reset OTP is ${otp}. It expires in 15 minutes.\n\nIf you did not request this, please contact your administrator.`,
    html: `
      <p>Hello ${name || "User"},</p>
      <p>Your Apollo-Freight Solutions password reset OTP is:</p>
      <h2>${otp}</h2>
      <p>This OTP expires in 15 minutes.</p>
      <p>If you did not request this, please contact your administrator.</p>
    `
  });
}
