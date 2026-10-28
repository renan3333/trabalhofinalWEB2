import { asyncHandler } from '../utils/asyncHandler.js';

export function createAuthController({ authService }) {
  return {
    register: asyncHandler(async (req, res) => {
      res.status(201).json(await authService.register(req.valid.body));
    }),
    login: asyncHandler(async (req, res) => {
      res.json(await authService.login(req.valid.body));
    }),
    me: (req, res) => res.json({ user: req.user }),
  };
}
