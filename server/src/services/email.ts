import nodemailer from "nodemailer";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";

export async function sendPasswordResetEmail(
  recipient: string,
  resetUrl: string,
): Promise<void> {
  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASS) {
    throw new ApiError(503, "Password reset email is not configured");
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: `"Course Vault" <${env.SMTP_USER}>`,
      to: recipient,
      subject: "Reset your Course Vault password",
      text: `We received a request to reset your password. Open this link within 30 minutes to choose a new password:\n\n${resetUrl}\n\nIf you did not request a reset, you can ignore this email.`,
      html: `<p>We received a request to reset your Course Vault password.</p><p><a href="${resetUrl}">Choose a new password</a></p><p>This link expires in 30 minutes. If you did not request a reset, you can ignore this email.</p>`,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "EAUTH"
    ) {
      throw new ApiError(
        503,
        "Gmail rejected SMTP authentication. Check that SMTP_USER is the Gmail account that created the App Password and SMTP_PASS is that current App Password.",
      );
    }
    throw error;
  }
}
