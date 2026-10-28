import { asyncHandler } from '../utils/asyncHandler.js';

export function createInstrumentController({ instrumentService }) {
  return {
    list: asyncHandler(async (_req, res) => res.json(await instrumentService.list())),
    get: asyncHandler(async (req, res) =>
      res.json(await instrumentService.getById(req.valid.params.id))),
    create: asyncHandler(async (req, res) =>
      res.status(201).json(await instrumentService.create(req.valid.body))),
    update: asyncHandler(async (req, res) =>
      res.json(await instrumentService.update(req.valid.params.id, req.valid.body))),
    remove: asyncHandler(async (req, res) => {
      await instrumentService.remove(req.valid.params.id);
      res.status(204).end();
    }),
  };
}
