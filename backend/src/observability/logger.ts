const LOG_LEVEL = process.env.LOG_LEVEL || "info";

const levels = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const currentLevel = levels[LOG_LEVEL as keyof typeof levels] || levels.info;

function formatLog(level: string, message: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const dataStr = data ? ` ${JSON.stringify(data)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
}

export const logger = {
  debug: (message: string, data?: Record<string, unknown>) => {
    if (currentLevel <= levels.debug) {
      console.debug(formatLog("debug", message, data));
    }
  },

  info: (message: string, data?: Record<string, unknown>) => {
    if (currentLevel <= levels.info) {
      console.log(formatLog("info", message, data));
    }
  },

  warn: (message: string, data?: Record<string, unknown>) => {
    if (currentLevel <= levels.warn) {
      console.warn(formatLog("warn", message, data));
    }
  },

  error: (message: string, data?: Record<string, unknown>) => {
    if (currentLevel <= levels.error) {
      console.error(formatLog("error", message, data));
    }
  }
};
