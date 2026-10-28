// Valida body/params/query com Zod. Os dados já convertidos ficam em req.valid.
export const validate = (schemas) => (req, _res, next) => {
  try {
    req.valid = req.valid || {};
    for (const part of ['params', 'query', 'body']) {
      if (schemas[part]) req.valid[part] = schemas[part].parse(req[part] ?? {});
    }
    next();
  } catch (err) {
    next(err);
  }
};
