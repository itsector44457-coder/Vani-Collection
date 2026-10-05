const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const { AppError, asyncHandler } = require('../lib/errors');

function authMiddleware(config) {
  return asyncHandler(async (req, _res, next) => {
    const token = req.cookies?.accessToken || req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new AppError(401, 'AUTH_REQUIRED', 'Authentication required');
    let payload;
    try { payload = jwt.verify(token, config.JWT_ACCESS_SECRET); }
    catch { throw new AppError(401, 'INVALID_TOKEN', 'Session is invalid or expired'); }
    const user = await User.findById(payload.sub);
    if (!user || user.status !== 'active') throw new AppError(401, 'ACCOUNT_UNAVAILABLE', 'Account is unavailable');
    req.user = user;
    next();
  });
}

const requireRoles = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.some((r) => req.user.roles.includes(r))) return next(new AppError(403, 'FORBIDDEN', 'Insufficient permission'));
  next();
};
module.exports = { authMiddleware, requireRoles };
