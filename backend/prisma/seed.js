import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Credenciais iguais às documentadas no README do projeto.
const users = [
  { name: 'Administrador', email: 'admin@tommusic.com', password: 'admin123', role: 'ADMIN' },
  { name: 'Professor Tom', email: 'professor@tommusic.com', password: 'prof123', role: 'PROFESSOR' },
  { name: 'João Silva', email: 'joao@email.com', password: '123456', role: 'ALUNO' },
];
const instruments = [
  { name: 'Violão', description: 'Violão clássico e popular' },
  { name: 'Teclado', description: 'Teclado e piano' },
  { name: 'Bateria', description: 'Bateria e percussão' },
];

for (const { password, ...u } of users) {
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email: u.email },
    update: {},
    create: { ...u, passwordHash },
  });
}
for (const i of instruments) {
  await prisma.instrument.upsert({ where: { name: i.name }, update: {}, create: i });
}
console.log('Seed concluído.');
await prisma.$disconnect();
