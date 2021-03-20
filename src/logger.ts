import { createLogger, transports, format } from 'winston';

export const logger = createLogger({
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf((info) => `${info.timestamp} link-telegram-bot ${info.level.toUpperCase()}: ${info.message}`)
  ),
  transports: [new transports.Console({ level: 'debug' })],
});
