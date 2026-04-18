const { AuthService } = require('../services');
const { UserRepository } = require('../repositories');
const { validatePasswordStrength, passwordStrengthMessage } = require('../utils/passwordPolicy');

class AuthController {
  /** POST /auth/login */
  static async login(req, res) {
    try {
      const { email, password, chapter_id } = req.body;
      if (!email || !password || !chapter_id) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Email, password, and chapter_id are required' } });
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
  static async requestPasswordReset(req, res) {
    try {
      const { email, chapter_id } = req.body;
      if (!email || !chapter_id) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Email and chapter_id are required' } });
        return;
      }
      await AuthService.requestPasswordReset(email, chapter_id);
      // Always return same message to prevent email enumeration
      res.json({ success: true, data: { message: 'If that account exists, a verification code has been sent.' } });
    } catch (err) {
      console.error('Password reset code request error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to process request' } });
    }
  }

  /** POST /auth/reset-password */
  static async resetPassword(req, res) {
    try {
      const { email, chapter_id, code, new_password } = req.body;
      if (!email || !chapter_id || !code || !new_password) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Email, chapter_id, code, and new_password are required' } });
        return;
      }
      if (!validatePasswordStrength(new_password)) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION', message: passwordStrengthMessage() } });
        return;
      }
      const result = await AuthService.resetPassword({ email, chapter_id, code, new_password });
      if (!result) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Invalid or expired verification code' } });
        return;
      }
      res.json({ success: true, data: { message: 'Password reset successfully' } });
    } catch (err) {
      console.error('Reset password error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to reset password' } });
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
