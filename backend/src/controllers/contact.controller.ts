import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { sendBrandedEmail } from "../utils/email.js";
import { validateEmail } from "../utils/email-validation.js";

const emailSchema = z.string().max(255).refine(validateEmail, "Invalid email address");

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: emailSchema,
  message: z.string().min(1, "Message is required")
});

const validationError = (error: z.ZodError) => {
  const fields = Object.fromEntries(error.issues.map((issue) => [issue.path.join("."), issue.message]));
  return { error: "VALIDATION_ERROR", fields };
};

async function submit(req: Request, res: Response, next: NextFunction) {
  try {
    const result = contactSchema.safeParse(req.body);
    if (!result.success) {
      res.status(422).json(validationError(result.error));
      return;
    }

    const { name, email, message } = result.data;

    // SECURITY: Only send email to support team, don't create user account or database records
    // Contact form is public-facing and should not auto-enroll users
    const supportEmail = process.env.SUPPORT_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER || env.SMTP_USER;

    try {
      await sendBrandedEmail(
        supportEmail,
        `New Contact Form Submission from ${name}`,
        "New Contact Message",
        `
          <h2>Contact Form Submission</h2>
          <p><strong>From:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, "<br>")}</p>
          <div class="divider"></div>
          <p class="muted">Reply directly to this email to contact the sender.</p>
        `,
        { replyTo: email }
      );
    } catch {
      // Ignore email failures - non-critical
    }

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

export const contactController = { submit };
