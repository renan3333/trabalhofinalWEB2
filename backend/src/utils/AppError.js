export class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (msg, details) => new AppError(400, msg, details);
export const unauthorized = (msg = 'Não autenticado') => new AppError(401, msg);
export const forbidden = (msg = 'Sem permissão para esta ação') => new AppError(403, msg);
export const notFound = (msg = 'Recurso não encontrado') => new AppError(404, msg);
export const conflict = (msg) => new AppError(409, msg);
export const unprocessable = (msg, details) => new AppError(422, msg, details);
