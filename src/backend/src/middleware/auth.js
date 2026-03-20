const jwt = require('jsonwebtoken');
const { config } = require('../config');

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: { code: 'AUTH_MISSING', message: 'Missing or malformed authorization header' } });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ success: false, error: { code: 'AUTH_INVALID', message: 'Invalid or expired token' } });
  }
}

function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const token = header.slice(7);
    try {
      req.user = jwt.verify(token, config.jwtSecret);
    } catch { /* ignore */ }
  }
  next();
}

module.exports = { authenticate, optionalAuth };
