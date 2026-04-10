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
      if (result?.error?.code === 'PARTNER_INACTIVE') {
        res.status(403).json({ success: false, error: { code: result.error.code, message: result.error.message } });
        return;
      }
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
      const { password_hash: _, partner: partnerAccount, ...safeUser } = user;
      if (partnerAccount) {
        safeUser.partner_id = partnerAccount.partner_id;
        safeUser.partner_name = partnerAccount.partner_name;
      } else if (user.partner_id) {
        safeUser.partner_id = user.partner_id;
      }
      res.json({ success: true, data: safeUser });
    } catch (err) {
      console.error('Get me error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch user' } });
    }
  }

  /** POST /auth/partner-activation/request */
  static async requestPartnerActivation(req, res) {
    try {
      const { email, chapter_id } = req.body;
      if (!email || !chapter_id) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Email and chapter_id are required' } });
        return;
      }
      const result = await AuthService.requestPartnerActivation(email, chapter_id);
      res.json({
        success: true,
        data: {
          message: 'Partner account has been activated. Password has been sent to the partner email.',
          ...(result?.temporary_password ? { temporary_password: result.temporary_password } : {}),
        },
      });
    } catch (err) {
      if (err.code === 'NOT_FOUND') {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: err.message } });
        return;
      }
      if (err.code === 'VALIDATION') {
        res.status(400).json({ success: false, error: { code: 'VALIDATION', message: err.message } });
        return;
      }
      if (err.code === 'EMAIL_NOT_CONFIGURED') {
        res.status(503).json({ success: false, error: { code: 'EMAIL_NOT_CONFIGURED', message: err.message } });
        return;
      }
      console.error('Request partner activation error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to request activation' } });
    }
  }

  /** POST /auth/partner-activation/complete */
  static async completePartnerActivation(req, res) {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'token and password are required' } });
        return;
      }

      await AuthService.completePartnerActivation(token, password);
      res.json({ success: true, data: { message: 'Account activated successfully. You can now log in.' } });
    } catch (err) {
      if (err.code === 'INVALID_TOKEN') {
        res.status(400).json({ success: false, error: { code: 'INVALID_TOKEN', message: err.message } });
        return;
      }
      if (err.code === 'NOT_FOUND') {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: err.message } });
        return;
      }
      console.error('Complete partner activation error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to activate account' } });
    }
  }
}

module.exports = { AuthController };
