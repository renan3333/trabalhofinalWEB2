import 'dotenv/config';
import path from 'node:path';

const nodeEnv = process.env.NODE_ENV || 'development';

if (nodeEnv === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET é obrigatório em produção.');
}

export const env = {
  nodeEnv,
  port: Number(process.env.PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-apenas-para-desenvolvimento',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  uploadDir: process.env.UPLOAD_DIR || path.resolve('uploads'),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  // Pasta do front-end (raiz do repositório). Servida pelo próprio Express.
  frontendDir: process.env.FRONTEND_DIR || path.resolve('..'),
};
