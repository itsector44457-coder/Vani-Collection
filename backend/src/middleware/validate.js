const { AppError } = require('../lib/errors');
const validate = (schema, target = 'body') => (req, _res, next) => {
  const parsed = schema.safeParse(req[target]);
  if (!parsed.success) return next(new AppError(422, 'VALIDATION_ERROR', 'Request validation failed', parsed.error.flatten()));
  req[target] = parsed.data;
  next();
};
module.exports = { validate };
