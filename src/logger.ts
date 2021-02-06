import { createLogger, transports, format } from 'winston';

const cwd = process.cwd().split('src')[0];

export const logger = createLogger({
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf((info) => `${info.timestamp} chainlink-bot ${info.level.toUpperCase()}: ${info.message}`)
  ),
  transports: [
    new transports.File({
      filename: `${cwd}/logs/chainlink-bot.log`,
      level: 'info',
      maxFiles: 10,
      maxsize: 10485760,
    }),
    new transports.Console({ level: 'debug' }),
  ],
});
