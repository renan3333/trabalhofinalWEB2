// Remove campos sensíveis antes de enviar o usuário ao cliente.
export function toPublicUser(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
}
