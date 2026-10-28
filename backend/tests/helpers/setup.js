import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../src/app.js';
import { createMemoryRepositories } from './memoryRepositories.js';

export const FIXED_NOW = new Date('2030-01-10T12:00:00Z'); // relógio fixo nos testes
export const FUTURE_DATE = '2030-02-15';

// Cria app + usuários (admin, professor, 2 alunos) + instrumento e já faz login de cada um.
export async function buildTestContext() {
  const repositories = createMemoryRepositories();
  const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tommusic-'));
  const app = createApp({
    repositories,
    now: () => FIXED_NOW,
    config: { jwtSecret: 'test-secret', jwtExpiresIn: '1h', uploadDir, corsOrigin: '*', frontendDir: null },
  });

  const mk = async (name, email, role) =>
    repositories.userRepository.create({ name, email, role, passwordHash: await bcrypt.hash('123456', 4) });
  const admin = await mk('Admin', 'admin@t.com', 'ADMIN');
  const teacher = await mk('Prof', 'prof@t.com', 'PROFESSOR');
  const student = await mk('Aluno', 'aluno@t.com', 'ALUNO');
  const student2 = await mk('Aluno2', 'aluno2@t.com', 'ALUNO');
  const instrument = await repositories.instrumentRepository.create({ name: 'Violão' });

  const login = async (email) =>
    (await request(app).post('/api/auth/login').send({ email, password: '123456' })).body.token;

  return {
    app, repositories, uploadDir, admin, teacher, student, student2, instrument,
    tokens: {
      admin: await login('admin@t.com'),
      teacher: await login('prof@t.com'),
      student: await login('aluno@t.com'),
      student2: await login('aluno2@t.com'),
    },
  };
}

export const auth = (token) => ({ Authorization: `Bearer ${token}` });
