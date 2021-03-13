import { createLogger, transports, format } from 'winston';

export const logger = createLogger({
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf((info) => `${info.timestamp} chainlink-bot ${info.level.toUpperCase()}: ${info.message}`)
  ),
  transports: [
    new transports.Console({ level: 'error' }),
    new transports.Console({ level: 'debug' }),
    new transports.Console({ level: 'info' }),
    new transports.Console({ level: 'warn' }),
  ],
});
