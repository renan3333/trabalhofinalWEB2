import { describe, it, expect } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createMemoryRepositories } from './helpers/memoryRepositories.js';

// O Express serve o front-end (raiz do repositório) sem expor o código do back-end.
const app = createApp({
  repositories: createMemoryRepositories(),
  config: {
    jwtSecret: 's', jwtExpiresIn: '1h', corsOrigin: '*',
    uploadDir: path.join(os.tmpdir(), 'tommusic-static'),
    frontendDir: path.resolve('..'),
  },
});

describe('front-end estático', () => {
  it('serve index e login', async () => {
    expect((await request(app).get('/')).status).toBe(200);
    const login = await request(app).get('/login.html');
    expect(login.status).toBe(200);
    expect(login.text).toContain('script.js');
  });

  it('não expõe a pasta backend', async () => {
    expect((await request(app).get('/backend/package.json')).status).toBe(404);
    expect((await request(app).get('/backend/src/app.js')).status).toBe(404);
  });
});
