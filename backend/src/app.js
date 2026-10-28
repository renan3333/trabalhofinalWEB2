import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import { createAuthenticate } from './middlewares/auth.js';
import { createAvatarUpload } from './middlewares/upload.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { createRoutes } from './routes/index.js';
import { openapi } from './docs/openapi.js';

import { createAuthService } from './services/authService.js';
import { createUserService } from './services/userService.js';
import { createInstrumentService } from './services/instrumentService.js';
import { createLessonService } from './services/lessonService.js';
import { createAuthController } from './controllers/authController.js';
import { createUserController } from './controllers/userController.js';
import { createInstrumentController } from './controllers/instrumentController.js';
import { createLessonController } from './controllers/lessonController.js';

/**
 * Monta a aplicação Express.
 * Os repositórios são injetados: em produção vêm do Prisma; nos testes, da memória.
 */
export function createApp({ repositories, config, now }) {
  const { userRepository, instrumentRepository, lessonRepository } = repositories;

  const authService = createAuthService({
    userRepository, jwtSecret: config.jwtSecret, jwtExpiresIn: config.jwtExpiresIn,
  });
  const userService = createUserService({ userRepository, uploadDir: config.uploadDir });
  const instrumentService = createInstrumentService({ instrumentRepository });
  const lessonService = createLessonService({
    lessonRepository, userRepository, instrumentRepository, now,
  });

  const controllers = {
    auth: createAuthController({ authService }),
    users: createUserController({ userService }),
    instruments: createInstrumentController({ instrumentService }),
    lessons: createLessonController({ lessonService }),
  };

  const app = express();
  app.disable('x-powered-by');
  // CSP desativada porque as páginas do front usam scripts inline e Font Awesome via CDN.
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',') }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi));
  app.use('/uploads', express.static(config.uploadDir));

  app.use('/api', createRoutes({
    controllers,
    authenticate: createAuthenticate({ userRepository, jwtSecret: config.jwtSecret }),
    avatarUpload: createAvatarUpload(config.uploadDir),
  }));
  app.use('/api', notFoundHandler);

  // Serve o front-end (HTML/CSS/JS) da raiz do repositório, sem expor o código do back-end.
  if (config.frontendDir && fs.existsSync(config.frontendDir)) {
    app.use(['/backend', '/node_modules', '/.git', '/.github'], notFoundHandler);
    app.use(express.static(config.frontendDir, { dotfiles: 'ignore' }));
  }

  app.use(errorHandler);
  return app;
}
