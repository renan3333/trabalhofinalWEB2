// Documentação OpenAPI 3 — disponível em /api/docs (Swagger UI).
const ref = (n) => ({ $ref: `#/components/schemas/${n}` });
const json = (schema) => ({ 'application/json': { schema } });
const secured = [{ bearerAuth: [] }];
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'integer' } };
const err = (description) => ({ description, content: json(ref('Error')) });
const common = {
  400: err('Dados inválidos'),
  401: err('Não autenticado'),
  403: err('Sem permissão'),
  404: err('Não encontrado'),
  409: err('Conflito'),
};
const pick = (...codes) => Object.fromEntries(codes.map((c) => [c, common[c]]));

export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Tom Music API',
    version: '1.0.0',
    description: 'API REST da escola de música Tom Music: autenticação, usuários, instrumentos e aulas.',
  },
  tags: [{ name: 'Auth' }, { name: 'Usuários' }, { name: 'Instrumentos' }, { name: 'Aulas' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Error: { type: 'object', properties: { error: { type: 'string' }, details: {} } },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' }, name: { type: 'string' }, email: { type: 'string' },
          phone: { type: 'string', nullable: true }, role: { type: 'string', enum: ['ALUNO', 'PROFESSOR', 'ADMIN'] },
          avatarUrl: { type: 'string', nullable: true },
        },
      },
      AuthResponse: { type: 'object', properties: { token: { type: 'string' }, user: ref('User') } },
      Instrument: {
        type: 'object',
        properties: { id: { type: 'integer' }, name: { type: 'string' }, description: { type: 'string', nullable: true } },
      },
      Lesson: {
        type: 'object',
        properties: {
          id: { type: 'integer' }, date: { type: 'string', example: '2030-05-20' }, time: { type: 'string', example: '14:00' },
          status: { type: 'string', enum: ['AGENDADA', 'CONCLUIDA', 'CANCELADA'] }, notes: { type: 'string', nullable: true },
          student: { type: 'object' }, teacher: { type: 'object' }, instrument: { type: 'object' },
        },
      },
    },
  },
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Auth'], summary: 'Cadastro de aluno',
        requestBody: { required: true, content: json({ type: 'object', required: ['name', 'email', 'password'], properties: { name: { type: 'string' }, email: { type: 'string' }, password: { type: 'string', minLength: 6 }, phone: { type: 'string' } } }) },
        responses: { 201: { description: 'Criado', content: json(ref('AuthResponse')) }, ...pick(400, 409) },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'], summary: 'Login (retorna JWT)',
        requestBody: { required: true, content: json({ type: 'object', required: ['email', 'password'], properties: { email: { type: 'string' }, password: { type: 'string' }, userType: { type: 'string', enum: ['aluno', 'professor', 'admin'] } } }) },
        responses: { 200: { description: 'OK', content: json(ref('AuthResponse')) }, ...pick(400, 401) },
      },
    },
    '/api/auth/me': {
      get: { tags: ['Auth'], summary: 'Usuário autenticado', security: secured, responses: { 200: { description: 'OK' }, ...pick(401) } },
    },
    '/api/users': {
      get: { tags: ['Usuários'], summary: 'Listar usuários (ADMIN; PROFESSOR vê apenas alunos)', security: secured, parameters: [{ name: 'role', in: 'query', schema: { type: 'string', enum: ['ALUNO', 'PROFESSOR', 'ADMIN'] } }], responses: { 200: { description: 'OK', content: json({ type: 'array', items: ref('User') }) }, ...pick(401, 403) } },
      post: { tags: ['Usuários'], summary: 'Criar usuário de qualquer perfil (ADMIN)', security: secured, requestBody: { required: true, content: json({ type: 'object', required: ['name', 'email', 'password'], properties: { name: { type: 'string' }, email: { type: 'string' }, password: { type: 'string' }, phone: { type: 'string' }, role: { type: 'string', enum: ['ALUNO', 'PROFESSOR', 'ADMIN'] } } }) }, responses: { 201: { description: 'Criado', content: json(ref('User')) }, ...pick(400, 401, 403, 409) } },
    },
    '/api/users/teachers': {
      get: { tags: ['Usuários'], summary: 'Listar professores (qualquer usuário autenticado)', security: secured, responses: { 200: { description: 'OK' }, ...pick(401) } },
    },
    '/api/users/{id}': {
      get: { tags: ['Usuários'], summary: 'Buscar usuário (próprio ou ADMIN)', security: secured, parameters: [idParam], responses: { 200: { description: 'OK', content: json(ref('User')) }, ...pick(401, 403, 404) } },
      patch: { tags: ['Usuários'], summary: 'Atualizar usuário (próprio ou ADMIN; só ADMIN altera role)', security: secured, parameters: [idParam], requestBody: { required: true, content: json({ type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' }, password: { type: 'string' }, phone: { type: 'string' }, role: { type: 'string' } } }) }, responses: { 200: { description: 'OK', content: json(ref('User')) }, ...pick(400, 401, 403, 404, 409) } },
      delete: { tags: ['Usuários'], summary: 'Excluir usuário (ADMIN)', security: secured, parameters: [idParam], responses: { 204: { description: 'Removido' }, ...pick(400, 401, 403, 404) } },
    },
    '/api/users/{id}/avatar': {
      post: { tags: ['Usuários'], summary: 'Upload da foto de perfil (JPG/PNG/WEBP, até 2 MB)', security: secured, parameters: [idParam], requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { avatar: { type: 'string', format: 'binary' } } } } } }, responses: { 200: { description: 'OK', content: json(ref('User')) }, ...pick(400, 401, 403, 404) } },
    },
    '/api/instruments': {
      get: { tags: ['Instrumentos'], summary: 'Listar instrumentos (público)', responses: { 200: { description: 'OK', content: json({ type: 'array', items: ref('Instrument') }) } } },
      post: { tags: ['Instrumentos'], summary: 'Criar instrumento (ADMIN)', security: secured, requestBody: { required: true, content: json({ type: 'object', required: ['name'], properties: { name: { type: 'string' }, description: { type: 'string' } } }) }, responses: { 201: { description: 'Criado', content: json(ref('Instrument')) }, ...pick(400, 401, 403, 409) } },
    },
    '/api/instruments/{id}': {
      get: { tags: ['Instrumentos'], summary: 'Buscar instrumento', parameters: [idParam], responses: { 200: { description: 'OK', content: json(ref('Instrument')) }, ...pick(404) } },
      patch: { tags: ['Instrumentos'], summary: 'Atualizar instrumento (ADMIN)', security: secured, parameters: [idParam], requestBody: { required: true, content: json({ type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' } } }) }, responses: { 200: { description: 'OK', content: json(ref('Instrument')) }, ...pick(400, 401, 403, 404, 409) } },
      delete: { tags: ['Instrumentos'], summary: 'Remover instrumento sem aulas (ADMIN)', security: secured, parameters: [idParam], responses: { 204: { description: 'Removido' }, ...pick(401, 403, 404, 409) } },
    },
    '/api/lessons': {
      get: { tags: ['Aulas'], summary: 'Listar aulas (aluno/professor veem só as suas; ADMIN vê todas)', security: secured, parameters: [{ name: 'instrumentId', in: 'query', schema: { type: 'integer' } }, { name: 'date', in: 'query', schema: { type: 'string' } }, { name: 'status', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'OK', content: json({ type: 'array', items: ref('Lesson') }) }, ...pick(400, 401) } },
      post: { tags: ['Aulas'], summary: 'Agendar aula', description: 'ALUNO informa teacherId; PROFESSOR informa studentId; ADMIN informa ambos. Horários: 08:00 a 18:00, de hora em hora. Retorna 409 em caso de conflito.', security: secured, requestBody: { required: true, content: json({ type: 'object', required: ['instrumentId', 'date', 'time'], properties: { instrumentId: { type: 'integer' }, teacherId: { type: 'integer' }, studentId: { type: 'integer' }, date: { type: 'string', example: '2030-05-20' }, time: { type: 'string', example: '14:00' }, notes: { type: 'string' } } }) }, responses: { 201: { description: 'Criada', content: json(ref('Lesson')) }, ...pick(400, 401, 404, 409), 422: err('Data/horário no passado') } },
    },
    '/api/lessons/availability': {
      get: { tags: ['Aulas'], summary: 'Horários de um professor em uma data', security: secured, parameters: [{ name: 'teacherId', in: 'query', required: true, schema: { type: 'integer' } }, { name: 'date', in: 'query', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' }, ...pick(400, 401, 404) } },
    },
    '/api/lessons/{id}': {
      get: { tags: ['Aulas'], summary: 'Buscar aula', security: secured, parameters: [idParam], responses: { 200: { description: 'OK', content: json(ref('Lesson')) }, ...pick(401, 403, 404) } },
      patch: { tags: ['Aulas'], summary: 'Atualizar/cancelar/reagendar aula', security: secured, parameters: [idParam], requestBody: { required: true, content: json({ type: 'object', properties: { status: { type: 'string', enum: ['AGENDADA', 'CONCLUIDA', 'CANCELADA'] }, notes: { type: 'string' }, date: { type: 'string' }, time: { type: 'string' } } }) }, responses: { 200: { description: 'OK', content: json(ref('Lesson')) }, ...pick(400, 401, 403, 404, 409) } },
      delete: { tags: ['Aulas'], summary: 'Excluir aula (ADMIN)', security: secured, parameters: [idParam], responses: { 204: { description: 'Removida' }, ...pick(401, 403, 404) } },
    },
  },
};
