const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
function issueTokens(user, config) {
  const accessToken = jwt.sign({ sub: user.id, roles: user.roles }, config.JWT_ACCESS_SECRET, { expiresIn: config.ACCESS_TOKEN_TTL, issuer: 'vani-api', audience: 'vani-web' });
  const refreshToken = jwt.sign({ sub: user.id, nonce: crypto.randomUUID() }, config.JWT_REFRESH_SECRET, { expiresIn: `${config.REFRESH_TOKEN_TTL_DAYS}d`, issuer: 'vani-api', audience: 'vani-web' });
  return { accessToken, refreshToken };
}
function setAuthCookies(res, tokens, config) {
  const common = {
    httpOnly: true,
    secure: config.COOKIE_SECURE || config.COOKIE_SAMESITE === 'none',
    sameSite: config.COOKIE_SAMESITE,
    path: '/',
    ...(config.COOKIE_DOMAIN ? { domain: config.COOKIE_DOMAIN } : {}),
  };
  res.cookie('accessToken', tokens.accessToken, { ...common, maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', tokens.refreshToken, { ...common, maxAge: config.REFRESH_TOKEN_TTL_DAYS * 86400000 });
}
module.exports = { issueTokens, setAuthCookies, hashToken };
