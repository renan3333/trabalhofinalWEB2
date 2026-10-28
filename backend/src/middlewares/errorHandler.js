import { ZodError } from 'zod';
import multer from 'multer';
import { AppError } from '../utils/AppError.js';

export function notFoundHandler(_req, res) {
  res.status(404).json({ error: 'Rota não encontrada' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Arquivo maior que 2 MB' : err.message;
    return res.status(400).json({ error: message });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido' });
  }
  // Erros conhecidos do Prisma (sem importar o Prisma aqui, para facilitar testes)
  if (err?.code === 'P2002') return res.status(409).json({ error: 'Registro já existe' });
  if (err?.code === 'P2025') return res.status(404).json({ error: 'Registro não encontrado' });

  console.error(err);
  return res.status(500).json({ error: 'Erro interno do servidor' });
}
