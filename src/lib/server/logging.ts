type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

function log(level: LogLevel, message: string, context?: LogContext) {
  const payload = context ? { message, ...context } : { message };
  switch (level) {
    case 'debug':
    case 'info':
      console.log(payload);
      break;
    case 'warn':
      console.warn(payload);
      break;
    case 'error':
      console.error(payload);
      break;
  }
}

export const logger = {
  debug(message: string, context?: LogContext) {
    log('debug', message, context);
  },
  info(message: string, context?: LogContext) {
    log('info', message, context);
  },
  warn(message: string, context?: LogContext) {
    log('warn', message, context);
  },
  error(message: string, context?: LogContext) {
    log('error', message, context);
  },
};
