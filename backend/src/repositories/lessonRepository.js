const include = {
  student: { select: { id: true, name: true } },
  teacher: { select: { id: true, name: true } },
  instrument: { select: { id: true, name: true } },
};

export function createLessonRepository(prisma) {
  return {
    list: ({ studentId, teacherId, instrumentId, date, status } = {}) =>
      prisma.lesson.findMany({
        where: {
          ...(studentId && { studentId }),
          ...(teacherId && { teacherId }),
          ...(instrumentId && { instrumentId }),
          ...(date && { date }),
          ...(status && { status }),
        },
        include,
        orderBy: [{ date: 'asc' }, { time: 'asc' }],
      }),
    findById: (id) => prisma.lesson.findUnique({ where: { id }, include }),
    create: (data) => prisma.lesson.create({ data, include }),
    update: (id, data) => prisma.lesson.update({ where: { id }, data, include }),
    remove: (id) => prisma.lesson.delete({ where: { id } }),
    // Aula AGENDADA no mesmo dia/horário para o mesmo professor OU o mesmo aluno.
    findConflict: ({ teacherId, studentId, date, time, excludeId }) =>
      prisma.lesson.findFirst({
        where: {
          date,
          time,
          status: 'AGENDADA',
          OR: [{ teacherId }, { studentId }],
          ...(excludeId && { NOT: { id: excludeId } }),
        },
      }),
    // Horários já ocupados de um professor em uma data.
    takenTimes: async ({ teacherId, date }) => {
      const rows = await prisma.lesson.findMany({
        where: { teacherId, date, status: 'AGENDADA' },
        select: { time: true },
      });
      return rows.map((r) => r.time);
    },
  };
}
