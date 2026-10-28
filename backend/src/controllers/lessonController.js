import { asyncHandler } from '../utils/asyncHandler.js';

export function createLessonController({ lessonService }) {
  return {
    list: asyncHandler(async (req, res) =>
      res.json(await lessonService.list(req.user, req.valid.query))),
    availability: asyncHandler(async (req, res) =>
      res.json(await lessonService.availability(req.valid.query))),
    get: asyncHandler(async (req, res) =>
      res.json(await lessonService.getById(req.user, req.valid.params.id))),
    create: asyncHandler(async (req, res) =>
      res.status(201).json(await lessonService.create(req.user, req.valid.body))),
    update: asyncHandler(async (req, res) =>
      res.json(await lessonService.update(req.user, req.valid.params.id, req.valid.body))),
    remove: asyncHandler(async (req, res) => {
      await lessonService.remove(req.valid.params.id);
      res.status(204).end();
    }),
  };
}
