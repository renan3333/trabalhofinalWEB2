import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { buildTestContext, auth, FUTURE_DATE } from './helpers/setup.js';

let ctx;
beforeEach(async () => { ctx = await buildTestContext(); });

const book = (token, extra = {}) =>
  request(ctx.app).post('/api/lessons').set(auth(token)).send({
    instrumentId: ctx.instrument.id, teacherId: ctx.teacher.id,
    date: FUTURE_DATE, time: '10:00', ...extra,
  });

describe('agendamento de aulas', () => {
  it('aluno agenda uma aula para si mesmo', async () => {
    const res = await book(ctx.tokens.student, { notes: 'Primeira aula' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      status: 'AGENDADA', date: FUTURE_DATE, time: '10:00',
      student: { id: ctx.student.id }, teacher: { id: ctx.teacher.id }, instrument: { name: 'Violão' },
    });
  });

  it('exige autenticação', async () => {
    const res = await request(ctx.app).post('/api/lessons').send({});
    expect(res.status).toBe(401);
  });

  it('valida formato de data e horário (400)', async () => {
    expect((await book(ctx.tokens.student, { date: '15/02/2030' })).status).toBe(400);
    expect((await book(ctx.tokens.student, { date: '2030-02-31' })).status).toBe(400);
    expect((await book(ctx.tokens.student, { time: '03:30' })).status).toBe(400);
  });

  it('não permite agendar no passado (422)', async () => {
    expect((await book(ctx.tokens.student, { date: '2029-12-31' })).status).toBe(422);
    // relógio fixo: 2030-01-10 12:00 UTC — 10:00 do mesmo dia já passou
    expect((await book(ctx.tokens.student, { date: '2030-01-10', time: '10:00' })).status).toBe(422);
  });

  it('retorna 404 para professor, instrumento ou aluno inexistente', async () => {
    expect((await book(ctx.tokens.student, { teacherId: 999 })).status).toBe(404);
    expect((await book(ctx.tokens.student, { teacherId: ctx.student2.id })).status).toBe(404); // não é professor
    expect((await book(ctx.tokens.student, { instrumentId: 999 })).status).toBe(404);
  });

  it('exige teacherId quando o aluno agenda', async () => {
    const res = await request(ctx.app).post('/api/lessons').set(auth(ctx.tokens.student))
      .send({ instrumentId: ctx.instrument.id, date: FUTURE_DATE, time: '10:00' });
    expect(res.status).toBe(400);
  });

  it('bloqueia conflito de horário do professor (409)', async () => {
    expect((await book(ctx.tokens.student)).status).toBe(201);
    const res = await book(ctx.tokens.student2);
    expect(res.status).toBe(409);
  });

  it('libera o horário depois de cancelar', async () => {
    const first = await book(ctx.tokens.student);
    await request(ctx.app).patch(`/api/lessons/${first.body.id}`)
      .set(auth(ctx.tokens.student)).send({ status: 'CANCELADA' });
    expect((await book(ctx.tokens.student2)).status).toBe(201);
  });

  it('professor agenda informando studentId; ADMIN informa ambos', async () => {
    const asTeacher = await request(ctx.app).post('/api/lessons').set(auth(ctx.tokens.teacher))
      .send({ instrumentId: ctx.instrument.id, studentId: ctx.student.id, date: FUTURE_DATE, time: '11:00' });
    expect(asTeacher.status).toBe(201);

    const asAdmin = await request(ctx.app).post('/api/lessons').set(auth(ctx.tokens.admin))
      .send({ instrumentId: ctx.instrument.id, studentId: ctx.student2.id, teacherId: ctx.teacher.id, date: FUTURE_DATE, time: '12:00' });
    expect(asAdmin.status).toBe(201);
  });
});

describe('consulta e disponibilidade', () => {
  it('cada perfil enxerga apenas as aulas que lhe cabem', async () => {
    await book(ctx.tokens.student, { time: '10:00' });
    await book(ctx.tokens.student2, { time: '11:00' });

    const s1 = await request(ctx.app).get('/api/lessons').set(auth(ctx.tokens.student));
    expect(s1.body).toHaveLength(1);
    const t = await request(ctx.app).get('/api/lessons').set(auth(ctx.tokens.teacher));
    expect(t.body).toHaveLength(2);
    const a = await request(ctx.app).get('/api/lessons?date=' + FUTURE_DATE).set(auth(ctx.tokens.admin));
    expect(a.body).toHaveLength(2);
  });

  it('aluno não acessa aula de outro aluno (403)', async () => {
    const lesson = await book(ctx.tokens.student2);
    const res = await request(ctx.app).get(`/api/lessons/${lesson.body.id}`).set(auth(ctx.tokens.student));
    expect(res.status).toBe(403);
  });

  it('lista os horários e marca os ocupados', async () => {
    await book(ctx.tokens.student, { time: '14:00' });
    const res = await request(ctx.app)
      .get(`/api/lessons/availability?teacherId=${ctx.teacher.id}&date=${FUTURE_DATE}`)
      .set(auth(ctx.tokens.student2));
    expect(res.status).toBe(200);
    expect(res.body.find((s) => s.time === '14:00').available).toBe(false);
    expect(res.body.find((s) => s.time === '15:00').available).toBe(true);
  });
});

describe('alteração de aulas', () => {
  it('aluno só pode cancelar (não reagendar nem concluir)', async () => {
    const { body } = await book(ctx.tokens.student);
    const url = `/api/lessons/${body.id}`;
    expect((await request(ctx.app).patch(url).set(auth(ctx.tokens.student)).send({ time: '11:00' })).status).toBe(403);
    expect((await request(ctx.app).patch(url).set(auth(ctx.tokens.student)).send({ status: 'CONCLUIDA' })).status).toBe(403);
    const cancel = await request(ctx.app).patch(url).set(auth(ctx.tokens.student)).send({ status: 'CANCELADA' });
    expect(cancel.status).toBe(200);
    expect(cancel.body.status).toBe('CANCELADA');
  });

  it('professor conclui a aula e reagenda sem conflito', async () => {
    const { body } = await book(ctx.tokens.student);
    await book(ctx.tokens.student2, { time: '11:00' });
    const url = `/api/lessons/${body.id}`;

    expect((await request(ctx.app).patch(url).set(auth(ctx.tokens.teacher)).send({ time: '11:00' })).status).toBe(409);
    expect((await request(ctx.app).patch(url).set(auth(ctx.tokens.teacher)).send({ time: '16:00' })).status).toBe(200);
    const done = await request(ctx.app).patch(url).set(auth(ctx.tokens.teacher)).send({ status: 'CONCLUIDA' });
    expect(done.body.status).toBe('CONCLUIDA');
  });

  it('não altera aula já concluída (exceto ADMIN) e apenas ADMIN exclui', async () => {
    const { body } = await book(ctx.tokens.student);
    const url = `/api/lessons/${body.id}`;
    await request(ctx.app).patch(url).set(auth(ctx.tokens.teacher)).send({ status: 'CONCLUIDA' });

    expect((await request(ctx.app).patch(url).set(auth(ctx.tokens.teacher)).send({ notes: 'x' })).status).toBe(409);
    expect((await request(ctx.app).delete(url).set(auth(ctx.tokens.teacher))).status).toBe(403);
    expect((await request(ctx.app).delete(url).set(auth(ctx.tokens.admin))).status).toBe(204);
    expect((await request(ctx.app).get(url).set(auth(ctx.tokens.admin))).status).toBe(404);
  });
});

describe('infraestrutura', () => {
  it('health check, rota inexistente e JSON inválido', async () => {
    expect((await request(ctx.app).get('/api/health')).body).toEqual({ status: 'ok' });
    expect((await request(ctx.app).get('/api/nada')).status).toBe(404);
    const bad = await request(ctx.app).post('/api/auth/login').set('Content-Type', 'application/json').send('{oops');
    expect(bad.status).toBe(400);
  });

  it('expõe a documentação OpenAPI', async () => {
    const res = await request(ctx.app).get('/api/docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger');
  });
});
