// Express 4 não captura erros de funções async; este wrapper encaminha ao errorHandler.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
