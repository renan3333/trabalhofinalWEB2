export function createInstrumentRepository(prisma) {
  return {
    findAll: () => prisma.instrument.findMany({ orderBy: { name: 'asc' } }),
    findById: (id) => prisma.instrument.findUnique({ where: { id } }),
    findByName: (name) => prisma.instrument.findUnique({ where: { name } }),
    create: (data) => prisma.instrument.create({ data }),
    update: (id, data) => prisma.instrument.update({ where: { id }, data }),
    remove: (id) => prisma.instrument.delete({ where: { id } }),
    countLessons: (id) => prisma.lesson.count({ where: { instrumentId: id } }),
  };
}
