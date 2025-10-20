type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function format(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  const base = `[${ts}] [${level.toUpperCase()}] ${message}`;
  if (!meta) return base;
  try {
    return `${base} ${JSON.stringify(meta)}`;
  } catch {
    return base;
  }
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== 'production') console.debug(format('debug', message, meta));
  },
  info(message: string, meta?: Record<string, unknown>) {
    console.info(format('info', message, meta));
  },
  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(format('warn', message, meta));
  },
  error(message: string, meta?: Record<string, unknown>) {
    console.error(format('error', message, meta));
  },
};


