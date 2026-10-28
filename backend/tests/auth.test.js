import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { buildTestContext, auth } from './helpers/setup.js';

let ctx;
beforeEach(async () => { ctx = await buildTestContext(); });

describe('POST /api/auth/register', () => {
  it('cadastra um aluno e retorna token sem expor o hash da senha', async () => {
    const res = await request(ctx.app).post('/api/auth/register')
      .send({ name: 'Maria Souza', email: 'MARIA@email.com', password: 'segredo1' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({ name: 'Maria Souza', email: 'maria@email.com', role: 'ALUNO' });
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('ignora tentativa de se cadastrar como ADMIN', async () => {
    const res = await request(ctx.app).post('/api/auth/register')
      .send({ name: 'Hacker', email: 'h@email.com', password: 'segredo1', role: 'ADMIN' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('ALUNO');
  });

  it('rejeita e-mail duplicado (409)', async () => {
    const res = await request(ctx.app).post('/api/auth/register')
      .send({ name: 'Outro', email: 'aluno@t.com', password: 'segredo1' });
    expect(res.status).toBe(409);
  });

  it('valida os dados (400 com detalhes por campo)', async () => {
    const res = await request(ctx.app).post('/api/auth/register')
      .send({ name: 'A', email: 'invalido', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.details.map((d) => d.field).sort()).toEqual(['email', 'name', 'password']);
  });
});

describe('POST /api/auth/login', () => {
  it('autentica com credenciais corretas', async () => {
    const res = await request(ctx.app).post('/api/auth/login')
      .send({ email: 'aluno@t.com', password: '123456', userType: 'aluno' });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('ALUNO');
  });

  it('rejeita senha errada e e-mail inexistente com a mesma mensagem', async () => {
    const a = await request(ctx.app).post('/api/auth/login').send({ email: 'aluno@t.com', password: 'x' });
    const b = await request(ctx.app).post('/api/auth/login').send({ email: 'nao@existe.com', password: 'x' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.error).toBe(b.body.error);
  });

  it('rejeita login pela aba de perfil errada', async () => {
    const res = await request(ctx.app).post('/api/auth/login')
      .send({ email: 'aluno@t.com', password: '123456', userType: 'admin' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('exige token', async () => {
    expect((await request(ctx.app).get('/api/auth/me')).status).toBe(401);
    expect((await request(ctx.app).get('/api/auth/me').set(auth('lixo'))).status).toBe(401);
  });

  it('retorna o usuário autenticado', async () => {
    const res = await request(ctx.app).get('/api/auth/me').set(auth(ctx.tokens.teacher));
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('prof@t.com');
  });
});
