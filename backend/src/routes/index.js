import { Router } from 'express';
import { authorize, selfOrAdmin } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import * as s from '../validators/schemas.js';

export function createRoutes({ controllers, authenticate, avatarUpload }) {
  const { auth, users, instruments, lessons } = controllers;
  const router = Router();

  // ----- Autenticação -----
  router.post('/auth/register', validate({ body: s.registerBody }), auth.register);
  router.post('/auth/login', validate({ body: s.loginBody }), auth.login);
  router.get('/auth/me', authenticate, auth.me);

  // ----- Usuários -----
  router.get('/users/teachers', authenticate, users.teachers);
  router.get('/users', authenticate, authorize('ADMIN', 'PROFESSOR'), validate({ query: s.listUsersQuery }), users.list);
  router.post('/users', authenticate, authorize('ADMIN'), validate({ body: s.createUserBody }), users.create);
  router.get('/users/:id', authenticate, validate({ params: s.idParams }), users.get);
  router.patch('/users/:id', authenticate, validate({ params: s.idParams, body: s.updateUserBody }), users.update);
  router.delete('/users/:id', authenticate, authorize('ADMIN'), validate({ params: s.idParams }), users.remove);
  router.post(
    '/users/:id/avatar',
    authenticate,
    validate({ params: s.idParams }),
    selfOrAdmin, // checa a permissão ANTES de gravar o arquivo em disco
    avatarUpload,
    users.avatar,
  );

  // ----- Instrumentos -----
  router.get('/instruments', instruments.list);
  router.get('/instruments/:id', validate({ params: s.idParams }), instruments.get);
  router.post('/instruments', authenticate, authorize('ADMIN'), validate({ body: s.instrumentBody }), instruments.create);
  router.patch('/instruments/:id', authenticate, authorize('ADMIN'), validate({ params: s.idParams, body: s.instrumentUpdateBody }), instruments.update);
  router.delete('/instruments/:id', authenticate, authorize('ADMIN'), validate({ params: s.idParams }), instruments.remove);

  // ----- Aulas -----
  router.get('/lessons/availability', authenticate, validate({ query: s.availabilityQuery }), lessons.availability);
  router.get('/lessons', authenticate, validate({ query: s.lessonListQuery }), lessons.list);
  router.post('/lessons', authenticate, validate({ body: s.lessonCreateBody }), lessons.create);
  router.get('/lessons/:id', authenticate, validate({ params: s.idParams }), lessons.get);
  router.patch('/lessons/:id', authenticate, validate({ params: s.idParams, body: s.lessonUpdateBody }), lessons.update);
  router.delete('/lessons/:id', authenticate, authorize('ADMIN'), validate({ params: s.idParams }), lessons.remove);

  return router;
}
