export function createUserRepository(prisma) {
  return {
    findById: (id) => prisma.user.findUnique({ where: { id } }),
    findByEmail: (email) => prisma.user.findUnique({ where: { email } }),
    list: ({ role } = {}) =>
      prisma.user.findMany({ where: role ? { role } : {}, orderBy: { name: 'asc' } }),
    create: (data) => prisma.user.create({ data }),
    update: (id, data) => prisma.user.update({ where: { id }, data }),
    remove: (id) => prisma.user.delete({ where: { id } }),
  };
}
