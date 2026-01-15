import winston from 'winston';
import path from 'node:path';
import { getPIIMasker } from './piiMasker';

// Export Logger type for use in other modules
export type Logger = winston.Logger;

const logDir = process.env.LOG_DIR || 'logs';
const logLevel = process.env.LOG_LEVEL || 'info';

/**
 * Custom format to mask PII data in logs
 */
const piiMaskFormat = winston.format((info) => {
  const masker = getPIIMasker();
  
  if (!masker.isEnabled()) {
    return info;
  }
  
  // Mask the message
  if (typeof info.message === 'string') {
    info.message = masker.maskString(info.message);
  }
  
  // Mask metadata
  const { level, message, timestamp, stack, label, ...meta } = info;
  if (Object.keys(meta).length > 0) {
    const maskedMeta = masker.maskObject(meta);
    Object.assign(info, maskedMeta);
  }
  
  return info;
});

const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  piiMaskFormat(),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    if (stack) {
      log += `\n${typeof stack === 'string' ? stack : JSON.stringify(stack)}`;
    }
    
    return log;
  })
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    level: logLevel,
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  })
];

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
}

export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  transports,
  exitOnError: false
});

/**
 * Create a child logger with a specific label
 */
export function createLogger(label: string): winston.Logger {
  return logger.child({ label });
}

// Create a stream for morgan HTTP logging
export const loggerStream = {
  write: (message: string) => {
    logger.info(message.trim());
  }
};
