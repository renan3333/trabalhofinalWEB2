import bcrypt from 'bcryptjs';
import { conflict, forbidden, notFound, badRequest } from '../utils/AppError.js';
import { toPublicUser } from '../utils/user.js';
import { removeUploadedFile } from '../middlewares/upload.js';

export function createUserService({ userRepository, uploadDir }) {
  const mustFind = async (id) => {
    const user = await userRepository.findById(id);
    if (!user) throw notFound('Usuário não encontrado');
    return user;
  };

  return {
    async list(actor, { role } = {}) {
      // Professor enxerga apenas alunos; ADMIN enxerga todos (com filtro opcional).
      const users = await userRepository.list({ role: actor.role === 'PROFESSOR' ? 'ALUNO' : role });
      return users.map(toPublicUser);
    },

    // Lista mínima de professores, para o aluno escolher no agendamento.
    async listTeachers() {
      const users = await userRepository.list({ role: 'PROFESSOR' });
      return users.map(({ id, name, avatarUrl }) => ({ id, name, avatarUrl }));
    },

    async getById(actor, id) {
      if (actor.role !== 'ADMIN' && actor.id !== id) throw forbidden();
      return toPublicUser(await mustFind(id));
    },

    async create({ name, email, password, phone, role }) {
      if (await userRepository.findByEmail(email)) throw conflict('E-mail já cadastrado');
      const passwordHash = await bcrypt.hash(password, 10);
      return toPublicUser(await userRepository.create({ name, email, passwordHash, phone, role }));
    },

    async update(actor, id, data) {
      if (actor.role !== 'ADMIN' && actor.id !== id) throw forbidden();
      if (data.role !== undefined && actor.role !== 'ADMIN') {
        throw forbidden('Apenas administradores podem alterar o perfil');
      }
      await mustFind(id);

      const { password, ...rest } = data;
      if (rest.email) {
        const other = await userRepository.findByEmail(rest.email);
        if (other && other.id !== id) throw conflict('E-mail já cadastrado');
      }
      const patch = { ...rest };
      if (password) patch.passwordHash = await bcrypt.hash(password, 10);
      return toPublicUser(await userRepository.update(id, patch));
    },

    async remove(actor, id) {
      if (actor.id === id) throw badRequest('Você não pode excluir a própria conta');
      const user = await mustFind(id);
      await userRepository.remove(id);
      removeUploadedFile(uploadDir, user.avatarUrl);
    },

    async setAvatar(id, filename) {
      const previousUrl = (await mustFind(id)).avatarUrl;
      const updated = await userRepository.update(id, { avatarUrl: `/uploads/${filename}` });
      removeUploadedFile(uploadDir, previousUrl); // apaga a foto anterior
      return toPublicUser(updated);
    },
  };
}
