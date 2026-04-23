import nodemailer from "nodemailer";

import { env } from "../config/env.js";

const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || String(env.SMTP_PORT), 10),
    secure: parseInt(process.env.SMTP_PORT || String(env.SMTP_PORT), 10) === 465,
    auth: {
      user: process.env.SMTP_USER || env.SMTP_USER,
      pass: process.env.SMTP_PASS || env.SMTP_PASS
    }
  });
};

export const transporter = getTransporter();

const getEmailTemplate = (title: string, content: string): string => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: "Cairo", "Manrope", -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #e5e5e5; background: #020202; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #a3e635 0%, #38bdf8 100%); color: #050505; padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0; box-shadow: 0 4px 20px rgba(163, 230, 53, 0.18); }
          .header h1 { margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px; }
          .header p { margin: 8px 0 0 0; font-size: 14px; opacity: 0.95; }
          .content { background: #080808; padding: 40px 30px; border: 1px solid rgba(163, 230, 53, 0.14); border-radius: 0 0 12px 12px; }
          .content h2 { margin: 0 0 15px 0; color: #f5f5f5; font-size: 22px; font-weight: 600; }
          .content p { margin: 15px 0; color: #b8b8b8; line-height: 1.7; }
          .cta-button { display: inline-block; background: #a3e635; color: #050505; padding: 14px 36px; text-decoration: none; border-radius: 8px; margin: 24px 0; font-weight: 700; font-size: 16px; transition: all 0.2s; border: 2px solid #a3e635; }
          .cta-button:hover { background: #b5f53f; transform: translateY(-1px); box-shadow: 0 4px 18px rgba(163, 230, 53, 0.25); }
          .footer { text-align: center; padding: 20px; color: #a1a1aa; font-size: 12px; }
          .divider { border-top: 1px solid rgba(0, 0, 0, 0.08); margin: 24px 0; }
          .highlight { background: #0d0d0d; padding: 16px 20px; border-left: 4px solid #a3e635; border-radius: 6px; margin: 20px 0; }
          .highlight p { margin: 0; color: #cfcfcf; font-size: 14px; }
          ul { color: #cfcfcf; line-height: 1.8; }
          ul li { margin: 8px 0; }
          strong { color: #f5f5f5; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>AI Workflow</h1>
            <p>${title}</p>
          </div>
          <div class="content">
            ${content}
            <div class="divider"></div>
            <p style="color: #a1a1aa; font-size: 12px; margin: 15px 0 0 0;">
              If you did not request this action, please ignore this email. Your account remains secure.
            </p>
          </div>
          <div class="footer">
            <p style="margin: 8px 0;">&copy; 2026 AI Workflow. All rights reserved.</p>
            <p style="margin: 4px 0;">This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

const sendTemplate = async (to: string, subject: string, content: string) => {
  try {
    const currentTransporter = getTransporter();
    const fromUser = process.env.SMTP_USER || env.SMTP_USER;
    const from = process.env.SMTP_FROM || `AI Workflow <${fromUser}>`;
    const result = await currentTransporter.sendMail({
      from,
      to,
      subject,
      html: content
    });
    if (env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.log(`Email sent successfully: ${result.messageId}`);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Email send failed:", error);
    throw error;
  }
};

export const sendVerificationEmail = async (
  to: string,
  fullName: string,
  verificationUrl: string
): Promise<void> => {
  const content = `
    <h2>Welcome to AI Workflow, ${fullName}! &#128075;</h2>
    <p>Thank you for signing up! To get started, please verify your email address by clicking the button below.</p>
    <div style="text-align: center;">
      <a href="${verificationUrl}" class="cta-button">Verify Email Address</a>
    </div>
    <p>Or copy and paste this link in your browser:</p>
    <div class="highlight">
      <p style="word-break: break-all; margin: 0;">${verificationUrl}</p>
    </div>
    <p><strong>Note:</strong> This link will expire in 24 hours. If you did not create this account, please disregard this email.</p>
  `;

  await sendTemplate(
    to,
    "Verify your AI Workflow account - Welcome!",
    getEmailTemplate("Verify Your Account", content)
  );
};

export const sendPasswordResetEmail = async (
  to: string,
  fullName: string,
  resetUrl: string
): Promise<void> => {
  const content = `
    <h2>Password Reset Request &#128272;</h2>
    <p>Hi ${fullName},</p>
    <p>We received a request to reset your password. If this was you, click the button below to set a new password.</p>
    <div style="text-align: center;">
      <a href="${resetUrl}" class="cta-button">Reset Password</a>
    </div>
    <p>Or copy and paste this link in your browser:</p>
    <div class="highlight">
      <p style="word-break: break-all; margin: 0;">${resetUrl}</p>
    </div>
    <p><strong>Important:</strong></p>
    <ul>
      <li>This link will expire in 1 hour</li>
      <li>If you didn't request this, you can safely ignore this email</li>
      <li>Your account is secure - the person requesting must know your email</li>
    </ul>
  `;

  await sendTemplate(
    to,
    "Reset your AI Workflow password",
    getEmailTemplate("Reset Password", content)
  );
};

export const sendTicketReplyEmail = async (
  to: string,
  customerName: string,
  adminName: string,
  message: string
): Promise<void> => {
  const content = `
    <h2>Support Ticket Reply &#128172;</h2>
    <p>Hi ${customerName},</p>
    <p><strong>${adminName}</strong> has replied to your support ticket:</p>
    <div class="highlight">
      <p style="margin: 0; white-space: pre-wrap;">${message}</p>
    </div>
    <p>You can view your full ticket and continue the conversation by logging into your account.</p>
    <p>If you have any additional questions, feel free to reply directly to this email or visit your support tickets.</p>
  `;

  await sendTemplate(
    to,
    "Your support ticket has been updated",
    getEmailTemplate("Support Ticket Reply", content)
  );
};
