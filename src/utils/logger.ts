const isDev = import.meta.env.DEV;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_PREFIX = '[WebTeacher]';

function formatMessage(level: LogLevel, message: string, ...args: unknown[]): void {
  if (!isDev && level === 'debug') return;

  const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
  const prefix = `${LOG_PREFIX} [${timestamp}] [${level.toUpperCase()}]`;

  switch (level) {
    case 'debug':
      console.debug(prefix, message, ...args);
      break;
    case 'info':
      console.info(prefix, message, ...args);
      break;
    case 'warn':
      console.warn(prefix, message, ...args);
      break;
    case 'error':
      console.error(prefix, message, ...args);
      break;
  }
}

export const logger = {
  debug: (message: string, ...args: unknown[]) => formatMessage('debug', message, ...args),
  info: (message: string, ...args: unknown[]) => formatMessage('info', message, ...args),
  warn: (message: string, ...args: unknown[]) => formatMessage('warn', message, ...args),
  error: (message: string, ...args: unknown[]) => formatMessage('error', message, ...args),
};
