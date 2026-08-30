// import winston from 'winston';
// import path from 'path';
// import { env } from './env';

// const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// const devFormat = printf(({ level, message, timestamp: ts, stack }) => {
//   return `${ts} [${level}]: ${stack || message}`;
// });

// /**
//  * Winston logger. Console (pretty) in dev, JSON + file transports in prod.
//  */
// export const logger = winston.createLogger({
//   level: env.logLevel,
//   format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), json()),
//   defaultMeta: { service: 'glorytecks-admin' },
//   transports: [
//     new winston.transports.Console({
//       format: env.isProd
//         ? combine(timestamp(), json())
//         : combine(colorize(), timestamp({ format: 'HH:mm:ss' }), errors({ stack: true }), devFormat),
//     }),
//   ],
// });

// if (env.isProd) {
//   logger.add(
//     new winston.transports.File({
//       filename: path.join('logs', 'error.log'),
//       level: 'error',
//       maxsize: 5 * 1024 * 1024,
//       maxFiles: 5,
//     }),
//   );
//   logger.add(
//     new winston.transports.File({
//       filename: path.join('logs', 'combined.log'),
//       maxsize: 5 * 1024 * 1024,
//       maxFiles: 5,
//     }),
//   );
// }

// // Stream adaptor so morgan writes through winston.
// export const morganStream = {
//   write: (message: string) => logger.http?.(message.trim()) ?? logger.info(message.trim()),
// };



import winston from "winston";
import { env } from "./env";

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const devFormat = printf(({ level, message, timestamp: ts, stack }) => {
  return `${ts} [${level}]: ${stack || message}`;
});

export const logger = winston.createLogger({
  level: env.logLevel,
  defaultMeta: {
    service: "glorytecks-admin",
  },
  transports: [
    new winston.transports.Console({
      format: env.isProd
        ? combine(timestamp(), json())
        : combine(
            colorize(),
            timestamp({ format: "HH:mm:ss" }),
            errors({ stack: true }),
            devFormat
          ),
    }),
  ],
});

export const morganStream = {
  write: (message: string) =>
    logger.http?.(message.trim()) ?? logger.info(message.trim()),
};