// Repositórios em memória com a mesma interface dos repositórios Prisma.
// Permitem testar a API inteira (rotas → controllers → services) sem banco de dados.
export function createMemoryRepositories() {
  const db = { users: [], instruments: [], lessons: [], seq: { u: 1, i: 1, l: 1 } };

  const userRepository = {
    findById: async (id) => db.users.find((u) => u.id === id) ?? null,
    findByEmail: async (email) => db.users.find((u) => u.email === email) ?? null,
    list: async ({ role } = {}) => db.users.filter((u) => !role || u.role === role),
    create: async (data) => {
      const user = { id: db.seq.u++, phone: null, avatarUrl: null, role: 'ALUNO', createdAt: new Date(), ...data };
      db.users.push(user);
      return user;
    },
    update: async (id, data) => Object.assign(db.users.find((u) => u.id === id), data),
    remove: async (id) => {
      db.users = db.users.filter((u) => u.id !== id);
      db.lessons = db.lessons.filter((l) => l.studentId !== id && l.teacherId !== id);
    },
  };

  const instrumentRepository = {
    findAll: async () => [...db.instruments],
    findById: async (id) => db.instruments.find((i) => i.id === id) ?? null,
    findByName: async (name) => db.instruments.find((i) => i.name === name) ?? null,
    create: async (data) => {
      const item = { id: db.seq.i++, description: null, ...data };
      db.instruments.push(item);
      return item;
    },
    update: async (id, data) => Object.assign(db.instruments.find((i) => i.id === id), data),
    remove: async (id) => { db.instruments = db.instruments.filter((i) => i.id !== id); },
    countLessons: async (id) => db.lessons.filter((l) => l.instrumentId === id).length,
  };

  const withRelations = (l) => {
    const pick = (u) => (u ? { id: u.id, name: u.name } : null);
    return {
      ...l,
      student: pick(db.users.find((u) => u.id === l.studentId)),
      teacher: pick(db.users.find((u) => u.id === l.teacherId)),
      instrument: pick(db.instruments.find((i) => i.id === l.instrumentId)),
    };
  };

  const lessonRepository = {
    list: async (f = {}) =>
      db.lessons
        .filter((l) => (!f.studentId || l.studentId === f.studentId)
          && (!f.teacherId || l.teacherId === f.teacherId)
          && (!f.instrumentId || l.instrumentId === f.instrumentId)
          && (!f.date || l.date === f.date)
          && (!f.status || l.status === f.status))
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
        .map(withRelations),
    findById: async (id) => {
      const l = db.lessons.find((x) => x.id === id);
      return l ? withRelations(l) : null;
    },
    create: async (data) => {
      const lesson = { id: db.seq.l++, notes: null, status: 'AGENDADA', createdAt: new Date(), ...data };
      db.lessons.push(lesson);
      return withRelations(lesson);
    },
    update: async (id, data) => withRelations(Object.assign(db.lessons.find((l) => l.id === id), data)),
    remove: async (id) => { db.lessons = db.lessons.filter((l) => l.id !== id); },
    findConflict: async ({ teacherId, studentId, date, time, excludeId }) =>
      db.lessons.find((l) => l.date === date && l.time === time && l.status === 'AGENDADA'
        && (l.teacherId === teacherId || l.studentId === studentId) && l.id !== excludeId) ?? null,
    takenTimes: async ({ teacherId, date }) =>
      db.lessons.filter((l) => l.teacherId === teacherId && l.date === date && l.status === 'AGENDADA').map((l) => l.time),
  };

  return { userRepository, instrumentRepository, lessonRepository };
}
