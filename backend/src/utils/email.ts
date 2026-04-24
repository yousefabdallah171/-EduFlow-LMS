import nodemailer from "nodemailer";

import { env } from "../config/env.js";
import { createSafeEmailOptions } from "./email-validation.js";

const BRAND_NAME = process.env.BRAND_NAME || "Yousef Abdallah Course";
const BRAND_PRIMARY = "#a3e635";
const BRAND_ACCENT = "#38bdf8";
const BRAND_SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER || env.SMTP_USER;

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const safeText = (value: string | null | undefined, fallback = "") => escapeHtml(String(value ?? fallback));

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

const getEmailTemplate = (title: string, content: string, preheader?: string): string => {
  const websiteUrl = env.FRONTEND_URL;
  const websiteHost = (() => {
    try {
      return new URL(websiteUrl).hostname;
    } catch {
      return websiteUrl;
    }
  })();

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="dark light">
        <meta name="supported-color-schemes" content="dark light">
        <style>
          body { font-family: "Cairo", "Manrope", -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #e5e5e5; background: #020202; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, ${BRAND_PRIMARY} 0%, ${BRAND_ACCENT} 100%); color: #050505; padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0; box-shadow: 0 4px 20px rgba(163, 230, 53, 0.18); }
          .header h1 { margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px; }
          .header p { margin: 8px 0 0 0; font-size: 14px; opacity: 0.95; }
          .content { background: #080808; padding: 40px 30px; border: 1px solid rgba(163, 230, 53, 0.14); border-radius: 0 0 12px 12px; }
          .content h2 { margin: 0 0 15px 0; color: #f5f5f5; font-size: 22px; font-weight: 600; }
          .content p { margin: 15px 0; color: #b8b8b8; line-height: 1.7; }
          .cta-button { display: inline-block; background: ${BRAND_PRIMARY}; color: #050505; padding: 14px 36px; text-decoration: none; border-radius: 8px; margin: 24px 0; font-weight: 700; font-size: 16px; transition: all 0.2s; border: 2px solid ${BRAND_PRIMARY}; }
          .cta-button:hover { background: #b5f53f; transform: translateY(-1px); box-shadow: 0 4px 18px rgba(163, 230, 53, 0.25); }
          .footer { text-align: center; padding: 20px; color: #a1a1aa; font-size: 12px; }
          .divider { border-top: 1px solid rgba(0, 0, 0, 0.08); margin: 24px 0; }
          .highlight { background: #0d0d0d; padding: 16px 20px; border-left: 4px solid ${BRAND_PRIMARY}; border-radius: 6px; margin: 20px 0; }
          .highlight p { margin: 0; color: #cfcfcf; font-size: 14px; }
          .muted { color: #a1a1aa; font-size: 12px; }
          .meta-row { display: flex; gap: 12px; flex-wrap: wrap; margin: 14px 0 0 0; }
          .meta-pill { background: rgba(163, 230, 53, 0.10); border: 1px solid rgba(163, 230, 53, 0.18); color: #d4d4d8; border-radius: 999px; padding: 8px 12px; font-size: 12px; }
          ul { color: #cfcfcf; line-height: 1.8; }
          ul li { margin: 8px 0; }
          strong { color: #f5f5f5; font-weight: 600; }
          @media (max-width: 620px) {
            .container { padding: 12px; }
            .header { padding: 28px 18px; }
            .header h1 { font-size: 26px; }
            .content { padding: 28px 18px; }
            .cta-button { width: 100%; box-sizing: border-box; text-align: center; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          ${
            preheader
              ? `<div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">${escapeHtml(
                  preheader
                )}</div>`
              : ""
          }
          <div class="header">
            <h1>${BRAND_NAME}</h1>
            <p>${title}</p>
          </div>
          <div class="content">
            ${content}
            <div class="divider"></div>
            <p class="muted" style="margin: 15px 0 0 0;">
              If you did not request this action, please ignore this email. Your account remains secure.
            </p>
          </div>
          <div class="footer">
            <p style="margin: 8px 0;">&copy; 2026 ${BRAND_NAME}. All rights reserved.</p>
            <p style="margin: 4px 0;"><a href="${websiteUrl}" style="color:#a1a1aa; text-decoration:none;">${websiteHost}</a></p>
            <p style="margin: 4px 0;">Need help? Contact <a href="mailto:${BRAND_SUPPORT_EMAIL}" style="color:#a3e635; text-decoration:none;">${BRAND_SUPPORT_EMAIL}</a></p>
          </div>
        </div>
      </body>
    </html>
  `;
};

export const sendBrandedEmail = async (
  to: string,
  subject: string,
  title: string,
  bodyHtml: string,
  options?: { preheader?: string; replyTo?: string }
) => {
  const currentTransporter = getTransporter();
  const fromUser = process.env.SMTP_USER || env.SMTP_USER;
  const from = process.env.SMTP_FROM || `${BRAND_NAME} <${fromUser}>`;

  const safeOptions = createSafeEmailOptions(to, subject, { replyTo: options?.replyTo, from });

  await currentTransporter.sendMail({
    from: safeOptions.from || from,
    replyTo: safeOptions.replyTo,
    to: safeOptions.to,
    subject: safeOptions.subject,
    html: getEmailTemplate(title, bodyHtml, options?.preheader)
  });
};

export const sendVerificationEmail = async (
  to: string,
  fullName: string,
  verificationUrl: string
): Promise<void> => {
  const name = safeText(fullName, "there");
  const content = `
    <h2>Welcome to ${BRAND_NAME}, ${name}!</h2>
    <p>Thank you for signing up! To get started, please verify your email address by clicking the button below.</p>
    <div class="meta-row">
      <span class="meta-pill">Link expires in <strong>24 hours</strong></span>
      <span class="meta-pill">Secure account activation</span>
    </div>
    <div style="text-align: center;">
      <a href="${verificationUrl}" class="cta-button">Verify Email Address</a>
    </div>
    <p>Or copy and paste this link in your browser:</p>
    <div class="highlight">
      <p style="word-break: break-all; margin: 0;">${verificationUrl}</p>
    </div>
    <p><strong>Tip:</strong> If the button does not work, use the link above.</p>
  `;

  await sendBrandedEmail(to, `Verify your ${BRAND_NAME} account`, "Verify Your Account", content, {
    preheader: "Confirm your email to activate your account."
  });
};

export const sendPasswordResetEmail = async (
  to: string,
  fullName: string,
  resetUrl: string
): Promise<void> => {
  const name = safeText(fullName, "there");
  const content = `
    <h2>Password Reset Request</h2>
    <p>Hi ${name},</p>
    <p>We received a request to reset your password. If this was you, click the button below to set a new password.</p>
    <div class="meta-row">
      <span class="meta-pill">Link expires in <strong>1 hour</strong></span>
      <span class="meta-pill">If you didn't request it, ignore</span>
    </div>
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

  await sendBrandedEmail(to, `Reset your ${BRAND_NAME} password`, "Reset Password", content);
};

export const sendTicketReplyEmail = async (
  to: string,
  customerName: string,
  adminName: string,
  message: string
): Promise<void> => {
  const safeCustomerName = safeText(customerName, "there");
  const safeAdminName = safeText(adminName, "Support Team");
  const safeMessage = escapeHtml(message);
  const content = `
    <h2>Support Ticket Reply</h2>
    <p>Hi ${safeCustomerName},</p>
    <p><strong>${safeAdminName}</strong> has replied to your support ticket:</p>
    <div class="highlight">
      <p style="margin: 0; white-space: pre-wrap;">${safeMessage}</p>
    </div>
    <p>You can view your full ticket and continue the conversation by logging into your account.</p>
    <p>If you have any additional questions, feel free to reply directly to this email or visit your support tickets.</p>
  `;

  await sendBrandedEmail(to, "Your support ticket has been updated", "Support Ticket Reply", content, {
    preheader: "A new reply is waiting in your support ticket.",
    replyTo: BRAND_SUPPORT_EMAIL
  });
};

export const sendTicketCreatedEmail = async (
  to: string,
  fullName: string,
  ticketId: string,
  subject: string,
  initialMessage: string,
  ticketUrl?: string
): Promise<void> => {
  const name = safeText(fullName, "there");
  const safeSubject = safeText(subject, "Support request");
  const safeBody = escapeHtml(initialMessage);
  const safeTicketId = safeText(ticketId, "");
  const content = `
    <h2>We received your message</h2>
    <p>Hi ${name},</p>
    <p>Thanks for reaching out. Our support team received your ticket and will reply as soon as possible.</p>
    <div class="meta-row">
      <span class="meta-pill">Ticket ID: <strong>${safeTicketId}</strong></span>
      <span class="meta-pill">Subject: <strong>${safeSubject}</strong></span>
    </div>
    <div class="highlight">
      <p style="margin: 0; white-space: pre-wrap;">${safeBody}</p>
    </div>
    ${
      ticketUrl
        ? `<div style="text-align:center;"><a href="${ticketUrl}" class="cta-button">View ticket</a></div>`
        : ""
    }
    <p class="muted">Tip: replying from your account keeps everything in one place.</p>
  `;

  await sendBrandedEmail(to, `${BRAND_NAME} support: ticket received`, "Support Ticket Created", content, {
    preheader: "Your support ticket has been created.",
    replyTo: BRAND_SUPPORT_EMAIL
  });
};

export const sendWelcomeEmail = async (to: string, fullName: string, dashboardUrl?: string): Promise<void> => {
  const name = safeText(fullName, "there");
  const content = `
    <h2>Your email is verified</h2>
    <p>Hi ${name},</p>
    <p>Your account is now verified. You can sign in and continue your learning journey.</p>
    <div class="meta-row">
      <span class="meta-pill">Arabic & English ready</span>
      <span class="meta-pill">Session-aware access</span>
    </div>
    ${
      dashboardUrl
        ? `<div style="text-align:center;"><a href="${dashboardUrl}" class="cta-button">Go to dashboard</a></div>`
        : ""
    }
    <p>If you have any questions, just contact us at <a href="mailto:${BRAND_SUPPORT_EMAIL}" style="color:#a3e635; text-decoration:none;">${BRAND_SUPPORT_EMAIL}</a>.</p>
  `;

  await sendBrandedEmail(to, `Welcome to ${BRAND_NAME}`, "Welcome", content, {
    preheader: "Your account is ready."
  });
};

export const sendEnrollmentActivatedEmail = async (to: string, fullName: string, dashboardUrl?: string): Promise<void> => {
  const name = safeText(fullName, "there");
  const content = `
    <h2>Access activated</h2>
    <p>Hi ${name},</p>
    <p>Your course access is now active. You can start watching lessons immediately.</p>
    <div class="meta-row">
      <span class="meta-pill">Immediate access</span>
      <span class="meta-pill">Protected playback</span>
    </div>
    ${
      dashboardUrl
        ? `<div style="text-align:center;"><a href="${dashboardUrl}" class="cta-button">Open dashboard</a></div>`
        : ""
    }
    <p class="muted">If you believe this is a mistake, contact support.</p>
  `;

  await sendBrandedEmail(to, `${BRAND_NAME}: access activated`, "Enrollment Activated", content, {
    preheader: "Your course access is now active."
  });
};

export const sendEnrollmentRevokedEmail = async (to: string, fullName: string, helpUrl?: string): Promise<void> => {
  const name = safeText(fullName, "there");
  const content = `
    <h2>Access update</h2>
    <p>Hi ${name},</p>
    <p>Your course access has been updated and is currently not active.</p>
    <div class="highlight">
      <p style="margin:0;">If you think this happened by mistake, please contact support and we’ll help quickly.</p>
    </div>
    ${
      helpUrl
        ? `<div style="text-align:center;"><a href="${helpUrl}" class="cta-button">Get help</a></div>`
        : ""
    }
  `;

  await sendBrandedEmail(to, `${BRAND_NAME}: access update`, "Enrollment Update", content, {
    preheader: "Your access status has changed."
  });
};

export const sendPaymentReceiptEmail = async (params: {
  to: string;
  fullName: string;
  paymentId: string;
  amountEgp: number;
  currency: string;
  purchasedAt: Date;
  dashboardUrl?: string;
}): Promise<void> => {
  const name = safeText(params.fullName, "there");
  const paymentId = safeText(params.paymentId, "");
  const amount = Number.isFinite(params.amountEgp) ? params.amountEgp.toFixed(2) : String(params.amountEgp);
  const purchasedAt = params.purchasedAt.toISOString();
  const content = `
    <h2>Payment received</h2>
    <p>Hi ${name},</p>
    <p>Thanks — your payment has been received successfully.</p>
    <div class="meta-row">
      <span class="meta-pill">Payment ID: <strong>${paymentId}</strong></span>
      <span class="meta-pill">Amount: <strong>${escapeHtml(amount)} ${escapeHtml(params.currency)}</strong></span>
    </div>
    <p class="muted">Date (UTC): ${escapeHtml(purchasedAt)}</p>
    ${
      params.dashboardUrl
        ? `<div style="text-align:center;"><a href="${params.dashboardUrl}" class="cta-button">Start learning</a></div>`
        : ""
    }
  `;

  await sendBrandedEmail(params.to, `${BRAND_NAME}: payment receipt`, "Receipt", content, {
    preheader: "Your payment was successful."
  });
};
