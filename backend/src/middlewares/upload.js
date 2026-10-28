import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { badRequest } from '../utils/AppError.js';

const EXT_BY_MIME = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

export function createAvatarUpload(uploadDir) {
  fs.mkdirSync(uploadDir, { recursive: true });
  const upload = multer({
    storage: multer.diskStorage({
      destination: uploadDir,
      // A extensão vem do mimetype validado, nunca do nome enviado pelo cliente.
      filename: (req, file, cb) =>
        cb(null, `avatar-${req.params.id}-${Date.now()}${EXT_BY_MIME[file.mimetype]}`),
    }),
    limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (!EXT_BY_MIME[file.mimetype]) {
        return cb(badRequest('Envie uma imagem JPG, PNG ou WEBP'));
      }
      cb(null, true);
    },
  });
  return upload.single('avatar');
}

export function removeUploadedFile(uploadDir, publicUrl) {
  if (!publicUrl?.startsWith('/uploads/')) return;
  const file = path.join(uploadDir, path.basename(publicUrl));
  fs.promises.unlink(file).catch(() => {});
}
