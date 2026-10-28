import { z } from 'zod';

export const SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00',
];

const name = z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres').max(100);
const email = z.string().trim().toLowerCase().email('E-mail inválido');
const password = z.string().min(6, 'Senha deve ter ao menos 6 caracteres').max(72);
const phone = z.string().trim().regex(/^[0-9()+\-\s]{8,20}$/, 'Telefone inválido');
const id = z.coerce.number().int().positive();
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato AAAA-MM-DD')
  .refine(
    (d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) &&
      new Date(`${d}T00:00:00Z`).toISOString().startsWith(d),
    'Data inválida',
  );
const time = z.string().refine((t) => SLOTS.includes(t), {
  message: `Horário inválido. Use um destes: ${SLOTS.join(', ')}`,
});

export const idParams = z.object({ id });

export const registerBody = z.object({ name, email, password, phone: phone.optional() });

export const loginBody = z.object({
  email,
  password: z.string().min(1, 'Informe a senha'),
  userType: z.enum(['aluno', 'professor', 'admin']).optional(),
});

export const createUserBody = z.object({
  name, email, password, phone: phone.optional(),
  role: z.enum(['ALUNO', 'PROFESSOR', 'ADMIN']).default('ALUNO'),
});

export const updateUserBody = z
  .object({
    name: name.optional(),
    email: email.optional(),
    password: password.optional(),
    phone: phone.nullable().optional(),
    role: z.enum(['ALUNO', 'PROFESSOR', 'ADMIN']).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Envie ao menos um campo para atualizar');

export const listUsersQuery = z.object({
  role: z.enum(['ALUNO', 'PROFESSOR', 'ADMIN']).optional(),
});

export const instrumentBody = z.object({
  name: z.string().trim().min(2).max(50),
  description: z.string().trim().max(300).optional(),
});

export const instrumentUpdateBody = instrumentBody
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Envie ao menos um campo para atualizar');

export const lessonCreateBody = z.object({
  instrumentId: id,
  teacherId: id.optional(),
  studentId: id.optional(),
  date,
  time,
  notes: z.string().trim().max(500).optional(),
});

export const lessonUpdateBody = z
  .object({
    status: z.enum(['AGENDADA', 'CONCLUIDA', 'CANCELADA']).optional(),
    notes: z.string().trim().max(500).optional(),
    date: date.optional(),
    time: time.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Envie ao menos um campo para atualizar');

export const lessonListQuery = z.object({
  instrumentId: id.optional(),
  date: date.optional(),
  status: z.enum(['AGENDADA', 'CONCLUIDA', 'CANCELADA']).optional(),
});

export const availabilityQuery = z.object({ teacherId: id, date });
