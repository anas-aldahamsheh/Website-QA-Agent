import pino from 'pino';

export const logger = pino({
  level: process.env['LOG_LEVEL'] || 'info',
  redact: {
    paths: [
      'password',
      '*.password',
      'secret',
      '*.secret',
      'token',
      '*.token',
      'cookie',
      '*.cookie',
      'authorization',
      '*.authorization',
      'apiKey',
      '*.apiKey',
      'encryptedValue',
      '*.encryptedValue'
    ],
    censor: '[REDACTED]'
  }
});
