import jwt from 'jsonwebtoken';
import { unauthorized, forbidden } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toPublicUser } from '../utils/user.js';

export function createAuthenticate({ userRepository, jwtSecret }) {
  return asyncHandler(async (req, _res, next) => {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) throw unauthorized('Token não informado');

    let payload;
    try {
      payload = jwt.verify(token, jwtSecret);
    } catch {
      throw unauthorized('Token inválido ou expirado');
    }

    const user = await userRepository.findById(Number(payload.sub));
    if (!user) throw unauthorized('Usuário do token não existe mais');
    req.user = toPublicUser(user);
    next();
  });
}

export const authorize = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user.role)) return next(forbidden());
  next();
};

// Permite apenas o próprio usuário ou um ADMIN (usado antes do upload).
export const selfOrAdmin = (req, _res, next) => {
  const targetId = Number(req.params.id);
  if (req.user.role !== 'ADMIN' && req.user.id !== targetId) return next(forbidden());
  next();
};
