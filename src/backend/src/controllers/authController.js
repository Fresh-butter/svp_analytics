const { AuthService } = require('../services');
const { UserRepository } = require('../repositories');

class AuthController {
  /** POST /auth/login */
  static async login(req, res) {
    try {
      const { email, password, chapter_id } = req.body;
      if (!email || !password) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Email and password are required' } });
        return;
      }
      const result = await AuthService.login(email, password, chapter_id);
      if (!result) {
        res.status(401).json({ success: false, error: { code: 'AUTH_FAILED', message: 'Invalid email or password' } });
        return;
      }
      res.json({ success: true, data: result });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Login failed' } });
    }
  }

  /** POST /auth/logout — client-side token discard (stateless JWT) */
  static async logout(_req, res) {
    res.json({ success: true, data: { message: 'Logged out successfully' } });
  }

  /** POST /auth/forgot-password */
  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Email is required' } });
        return;
      }
      const result = await AuthService.forgotPassword(email);
      // Always return same message to prevent email enumeration
      res.json({ success: true, data: { message: 'If that email exists, a new password has been sent.' } });
    } catch (err) {
      console.error('Forgot password error:', err);
      // For debugging in development, send the exact message
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to process request' } });
    }
  }

  /** GET /auth/me */
  static async me(req, res) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'AUTH_MISSING', message: 'Not authenticated' } });
        return;
      }
      const user = await UserRepository.findById(req.user.user_id);
      if (!user) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
        return;
      }
      const { password_hash: _, ...safeUser } = user;
      res.json({ success: true, data: safeUser });
    } catch (err) {
      console.error('Get me error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch user' } });
    }
  }
}

module.exports = { AuthController };
