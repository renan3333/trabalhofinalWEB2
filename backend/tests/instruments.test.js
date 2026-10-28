import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { buildTestContext, auth, FUTURE_DATE } from './helpers/setup.js';

let ctx;
beforeEach(async () => { ctx = await buildTestContext(); });

describe('instrumentos', () => {
  it('listagem é pública', async () => {
    const res = await request(ctx.app).get('/api/instruments');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('apenas ADMIN cria, e nome duplicado retorna 409', async () => {
    const body = { name: 'Flauta', description: 'Flauta transversal' };
    expect((await request(ctx.app).post('/api/instruments').set(auth(ctx.tokens.student)).send(body)).status).toBe(403);
    expect((await request(ctx.app).post('/api/instruments').send(body)).status).toBe(401);
    expect((await request(ctx.app).post('/api/instruments').set(auth(ctx.tokens.admin)).send(body)).status).toBe(201);
    expect((await request(ctx.app).post('/api/instruments').set(auth(ctx.tokens.admin)).send(body)).status).toBe(409);
  });

  it('atualiza e valida dados', async () => {
    const url = `/api/instruments/${ctx.instrument.id}`;
    const ok = await request(ctx.app).patch(url).set(auth(ctx.tokens.admin)).send({ description: 'Clássico' });
    expect(ok.status).toBe(200);
    expect(ok.body.description).toBe('Clássico');
    expect((await request(ctx.app).patch(url).set(auth(ctx.tokens.admin)).send({})).status).toBe(400);
  });

  it('não remove instrumento com aulas vinculadas (409)', async () => {
    await request(ctx.app).post('/api/lessons').set(auth(ctx.tokens.student)).send({
      instrumentId: ctx.instrument.id, teacherId: ctx.teacher.id, date: FUTURE_DATE, time: '10:00',
    });
    const res = await request(ctx.app).delete(`/api/instruments/${ctx.instrument.id}`).set(auth(ctx.tokens.admin));
    expect(res.status).toBe(409);
  });

  it('remove instrumento sem aulas', async () => {
    const res = await request(ctx.app).delete(`/api/instruments/${ctx.instrument.id}`).set(auth(ctx.tokens.admin));
    expect(res.status).toBe(204);
  });
});
