import { PrismaClient } from '@prisma/client';
import { env } from './config/env.js';
import { createApp } from './app.js';
import { createUserRepository } from './repositories/userRepository.js';
import { createInstrumentRepository } from './repositories/instrumentRepository.js';
import { createLessonRepository } from './repositories/lessonRepository.js';

const prisma = new PrismaClient();

const app = createApp({
  config: env,
  repositories: {
    userRepository: createUserRepository(prisma),
    instrumentRepository: createInstrumentRepository(prisma),
    lessonRepository: createLessonRepository(prisma),
  },
});

const server = app.listen(env.port, () => {
  console.log(`Tom Music rodando em http://localhost:${env.port}  (docs: /api/docs)`);
});

const shutdown = async () => {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
