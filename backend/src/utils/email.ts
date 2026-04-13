import nodemailer from "nodemailer";

import { env } from "../config/env.js";

const useDevMailbox =
  env.NODE_ENV === "development" &&
  (env.SMTP_HOST === "smtp.example.com" ||
    env.SMTP_USER === "noreply@eduflow.com" ||
    env.SMTP_PASS === "your_smtp_password");

const transporter = useDevMailbox
  ? nodemailer.createTransport({
      jsonTransport: true
    })
  : nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS
      }
    });

const sendTemplate = async (to: string, subject: string, content: string) => {
  const info = await transporter.sendMail({
    from: env.SMTP_USER,
    to,
    subject,
    html: content
  });

  if (useDevMailbox) {
    // eslint-disable-next-line no-console
    console.log(`Dev email queued: ${subject} -> ${to}`);
    if ("message" in info) {
      // eslint-disable-next-line no-console
      console.log(String(info.message));
    }
  }
};

export const sendVerificationEmail = async (
  to: string,
  fullName: string,
  verificationUrl: string
): Promise<void> => {
  await sendTemplate(
    to,
    "Verify your EduFlow account",
    `<p>Hello ${fullName},</p><p>Verify your account:</p><p><a href="${verificationUrl}">${verificationUrl}</a></p>`
  );
};

export const sendPasswordResetEmail = async (
  to: string,
  fullName: string,
  resetUrl: string
): Promise<void> => {
  await sendTemplate(
    to,
    "Reset your EduFlow password",
    `<p>Hello ${fullName},</p><p>Reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
  );
};
