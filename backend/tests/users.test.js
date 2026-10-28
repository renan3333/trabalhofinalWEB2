import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { buildTestContext, auth } from './helpers/setup.js';

let ctx;
beforeEach(async () => { ctx = await buildTestContext(); });

// PNG mínimo válido (1x1)
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

describe('usuários — permissões', () => {
  it('professor lista apenas alunos, mesmo pedindo outro perfil', async () => {
    const res = await request(ctx.app).get('/api/users?role=ADMIN').set(auth(ctx.tokens.teacher));
    expect(res.status).toBe(200);
    expect(res.body.every((u) => u.role === 'ALUNO')).toBe(true);
  });

  it('aluno não lista usuários; ADMIN lista com filtro', async () => {
    expect((await request(ctx.app).get('/api/users').set(auth(ctx.tokens.student))).status).toBe(403);
    const res = await request(ctx.app).get('/api/users?role=ALUNO').set(auth(ctx.tokens.admin));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].passwordHash).toBeUndefined();
  });

  it('qualquer autenticado lista professores (dados mínimos)', async () => {
    const res = await request(ctx.app).get('/api/users/teachers').set(auth(ctx.tokens.student));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: ctx.teacher.id, name: 'Prof', avatarUrl: null }]);
  });

  it('ADMIN cria professor; aluno não consegue', async () => {
    const body = { name: 'Novo Prof', email: 'np@t.com', password: 'abc123', role: 'PROFESSOR' };
    expect((await request(ctx.app).post('/api/users').set(auth(ctx.tokens.student)).send(body)).status).toBe(403);
    const res = await request(ctx.app).post('/api/users').set(auth(ctx.tokens.admin)).send(body);
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('PROFESSOR');
  });

  it('aluno vê/edita apenas o próprio perfil e não altera o role', async () => {
    const other = await request(ctx.app).get(`/api/users/${ctx.student2.id}`).set(auth(ctx.tokens.student));
    expect(other.status).toBe(403);

    const ok = await request(ctx.app).patch(`/api/users/${ctx.student.id}`)
      .set(auth(ctx.tokens.student)).send({ name: 'Aluno Novo' });
    expect(ok.status).toBe(200);
    expect(ok.body.name).toBe('Aluno Novo');

    const escalate = await request(ctx.app).patch(`/api/users/${ctx.student.id}`)
      .set(auth(ctx.tokens.student)).send({ role: 'ADMIN' });
    expect(escalate.status).toBe(403);
  });

  it('retorna 404 para usuário inexistente e 400 para id inválido', async () => {
    expect((await request(ctx.app).get('/api/users/9999').set(auth(ctx.tokens.admin))).status).toBe(404);
    expect((await request(ctx.app).get('/api/users/abc').set(auth(ctx.tokens.admin))).status).toBe(400);
  });

  it('ADMIN exclui usuário, mas não a própria conta', async () => {
    expect((await request(ctx.app).delete(`/api/users/${ctx.admin.id}`).set(auth(ctx.tokens.admin))).status).toBe(400);
    expect((await request(ctx.app).delete(`/api/users/${ctx.student2.id}`).set(auth(ctx.tokens.admin))).status).toBe(204);
  });
});

describe('upload de avatar', () => {
  it('salva a imagem e atualiza avatarUrl', async () => {
    const res = await request(ctx.app).post(`/api/users/${ctx.student.id}/avatar`)
      .set(auth(ctx.tokens.student)).attach('avatar', PNG, { filename: 'foto.png', contentType: 'image/png' });
    expect(res.status).toBe(200);
    expect(res.body.avatarUrl).toMatch(/^\/uploads\/avatar-\d+-\d+\.png$/);
    expect(fs.existsSync(path.join(ctx.uploadDir, path.basename(res.body.avatarUrl)))).toBe(true);

    const served = await request(ctx.app).get(res.body.avatarUrl);
    expect(served.status).toBe(200);
  });

  it('rejeita arquivo que não é imagem', async () => {
    const res = await request(ctx.app).post(`/api/users/${ctx.student.id}/avatar`)
      .set(auth(ctx.tokens.student)).attach('avatar', Buffer.from('<?php ?>'), { filename: 'x.php', contentType: 'text/plain' });
    expect(res.status).toBe(400);
    expect(fs.readdirSync(ctx.uploadDir)).toHaveLength(0);
  });

  it('rejeita imagem maior que 2 MB', async () => {
    const big = Buffer.alloc(2 * 1024 * 1024 + 10, 1);
    const res = await request(ctx.app).post(`/api/users/${ctx.student.id}/avatar`)
      .set(auth(ctx.tokens.student)).attach('avatar', big, { filename: 'big.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
  });

  it('impede alterar a foto de outro usuário sem gravar o arquivo', async () => {
    const res = await request(ctx.app).post(`/api/users/${ctx.student2.id}/avatar`)
      .set(auth(ctx.tokens.student)).attach('avatar', PNG, { filename: 'f.png', contentType: 'image/png' });
    expect(res.status).toBe(403);
    expect(fs.readdirSync(ctx.uploadDir)).toHaveLength(0);
  });

  it('exige o campo avatar', async () => {
    const res = await request(ctx.app).post(`/api/users/${ctx.student.id}/avatar`).set(auth(ctx.tokens.student));
    expect(res.status).toBe(400);
  });
});
