import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { conflict, unauthorized } from '../utils/AppError.js';
import { toPublicUser } from '../utils/user.js';

const TAB_TO_ROLE = { aluno: 'ALUNO', professor: 'PROFESSOR', admin: 'ADMIN' };

export function createAuthService({ userRepository, jwtSecret, jwtExpiresIn }) {
  const sign = (user) =>
    jwt.sign({ role: user.role }, jwtSecret, { subject: String(user.id), expiresIn: jwtExpiresIn });

  return {
    // Cadastro público: sempre cria ALUNO (professores/admins são criados por um ADMIN).
    async register({ name, email, password, phone }) {
      if (await userRepository.findByEmail(email)) throw conflict('E-mail já cadastrado');
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await userRepository.create({ name, email, passwordHash, phone, role: 'ALUNO' });
      return { token: sign(user), user: toPublicUser(user) };
    },

    async login({ email, password, userType }) {
      const user = await userRepository.findByEmail(email);
      const valid = user && (await bcrypt.compare(password, user.passwordHash));
      // Mesma mensagem para e-mail inexistente e senha errada (evita enumerar usuários).
      if (!valid) throw unauthorized('E-mail ou senha incorretos');
      if (userType && TAB_TO_ROLE[userType] !== user.role) {
        throw unauthorized('Este usuário não pertence ao perfil selecionado');
      }
      return { token: sign(user), user: toPublicUser(user) };
    },
  };
}
