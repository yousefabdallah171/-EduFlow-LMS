// Email validation and SMTP header injection prevention
// Prevents attacks like: attacker@example.com\r\nBcc: malicious@evil.com

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DANGEROUS_CHARS = /[\r\n\t\x00]/;

export const validateEmail = (email: unknown): email is string => {
  if (typeof email !== "string") return false;
  if (email.length > 255) return false;
  if (!email.includes("@")) return false;
  if (DANGEROUS_CHARS.test(email)) return false;
  return EMAIL_REGEX.test(email);
};

export const sanitizeEmail = (email: string): string => {
  if (!validateEmail(email)) {
    throw new Error("Invalid email format");
  }
  return email.trim().toLowerCase();
};

export const sanitizeEmailHeader = (header: string): string => {
  if (!header || typeof header !== "string") {
    return "";
  }
  return header.replace(/[\r\n\t\x00]/g, "").trim();
};

export const validateAndSanitizeRecipients = (recipients: string | string[]): string[] => {
  const emails = Array.isArray(recipients) ? recipients : [recipients];
  return emails
    .filter((email): email is string => typeof email === "string")
    .map((email) => {
      if (!validateEmail(email)) {
        throw new Error(`Invalid recipient email: ${email}`);
      }
      return sanitizeEmail(email);
    });
};

export const createSafeEmailOptions = (
  to: string | string[],
  subject: string,
  options?: { replyTo?: string; from?: string }
) => {
  return {
    to: validateAndSanitizeRecipients(to),
    subject: sanitizeEmailHeader(subject),
    replyTo: options?.replyTo ? sanitizeEmailHeader(options.replyTo) : undefined,
    from: options?.from ? sanitizeEmailHeader(options.from) : undefined
  };
};
