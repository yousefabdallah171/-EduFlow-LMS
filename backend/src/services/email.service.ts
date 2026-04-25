import { logger } from "../observability/logger.js";

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  context: Record<string, unknown>;
}

export const emailService = {
  async sendEmail(options: EmailOptions) {
    logger.info("Sending email", {
      to: options.to,
      template: options.template
    });

    // TODO: Implement actual email sending via nodemailer or similar
    // For now, return success
    return {
      success: true,
      messageId: `mock-${Date.now()}`,
      status: "sent"
    };
  }
};
