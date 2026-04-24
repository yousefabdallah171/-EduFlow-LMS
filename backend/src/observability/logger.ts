import winston from "winston";
import path from "path";

const logsDir = path.join(process.cwd(), "logs");

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "eduflow-payment" },
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      maxsize: 5242880,
      maxFiles: 10,
    }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

export function createPaymentLogger(paymentId: string, userId: string) {
  return {
    info: (msg: string, data?: any) =>
      logger.info(msg, { paymentId, userId, ...data }),
    error: (msg: string, error: Error, data?: any) =>
      logger.error(msg, {
        paymentId,
        userId,
        error: error.message,
        stack: error.stack,
        ...data,
      }),
    debug: (msg: string, data?: any) =>
      logger.debug(msg, { paymentId, userId, ...data }),
    warn: (msg: string, data?: any) =>
      logger.warn(msg, { paymentId, userId, ...data }),
  };
}
