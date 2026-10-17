const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const { AppError, asyncHandler } = require('../lib/errors');

function authMiddleware(config) {
  return asyncHandler(async (req, _res, next) => {
    const token = req.cookies?.accessToken || req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new AppError(401, 'AUTH_REQUIRED', 'Authentication required');
    let payload;
    try { payload = jwt.verify(token, config.JWT_ACCESS_SECRET, { issuer: 'vani-api', audience: 'vani-web' }); }
    catch { throw new AppError(401, 'INVALID_TOKEN', 'Session is invalid or expired'); }
    let user;
    try {
      user = await User.findById(payload.sub);
    } catch {
      throw new AppError(401, 'INVALID_TOKEN', 'Session is invalid or expired');
    }
    if (!user || user.status !== 'active') throw new AppError(401, 'ACCOUNT_UNAVAILABLE', 'Account is unavailable');
    req.user = user;
    const allowedDuringPasswordChange = ['/api/auth/me', '/api/auth/logout', '/api/auth/change-credentials'];
    if (user.mustChangePassword && !allowedDuringPasswordChange.includes(req.originalUrl.split('?')[0])) {
      throw new AppError(403, 'PASSWORD_CHANGE_REQUIRED', 'Change your temporary password before continuing');
    }
    next();
  });
}

/** Attaches req.user when a valid session exists, but never rejects the request (guest carts, etc.). */
function optionalAuthMiddleware(config) {
  return asyncHandler(async (req, _res, next) => {
    const token = req.cookies?.accessToken || req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) return next();
    let payload;
    try {
      payload = jwt.verify(token, config.JWT_ACCESS_SECRET, { issuer: 'vani-api', audience: 'vani-web' });
    } catch {
      /* an expired token simply means "guest" for optional routes */
      return next();
    }
    let user;
    try {
      user = await User.findById(payload.sub);
    } catch {
      return next();
    }
    if (user && user.status === 'active') {
      if (user.mustChangePassword) throw new AppError(403, 'PASSWORD_CHANGE_REQUIRED', 'Change your temporary password before continuing');
      req.user = user;
    }
    next();
  });
}

const requireRoles = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.some((r) => req.user.roles.includes(r))) return next(new AppError(403, 'FORBIDDEN', 'Insufficient permission'));
  next();
};

module.exports = { authMiddleware, optionalAuthMiddleware, requireRoles };
