const jwt = require('jsonwebtoken');
const { config } = require('../config');
const { UserRepository } = require('../repositories');

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: { code: 'AUTH_MISSING', message: 'Missing or malformed authorization header' } });
      return;
    }
    const token = header.slice(7);
    const payload = jwt.verify(token, config.jwtSecret);

    // Enforce lock state on every authenticated partner request so previously issued
    // JWTs are effectively invalidated as soon as an admin locks the account.
    if (payload.user_type === 'PARTNER') {
      const user = await UserRepository.findById(payload.user_id);
      if (!user || user.user_type !== 'PARTNER') {
        res.status(401).json({ success: false, error: { code: 'AUTH_INVALID', message: 'Invalid or expired token' } });
        return;
      }
      if (user.is_active === false) {
        res.status(403).json({ success: false, error: { code: 'PARTNER_LOCKED', message: 'Partner account is locked. Please contact your chapter admin.' } });
        return;
      }
    }

    req.user = payload;
    next();
  } catch (err) {
    if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
      res.status(401).json({ success: false, error: { code: 'AUTH_INVALID', message: 'Invalid or expired token' } });
      return;
    }

    console.error('Authentication middleware error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Authentication failed' } });
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

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: 'AUTH_MISSING', message: 'Not authenticated' } });
      return;
    }

    if (!allowedRoles.includes(req.user.user_type)) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to access this resource' } });
      return;
    }

    next();
  };
}

const requireAdmin = requireRole('ADMIN');

module.exports = { authenticate, optionalAuth, requireRole, requireAdmin };
