const { UserRepository } = require('../repositories');
const { AuthService } = require('../services');

class SettingsController {
  /** GET /settings/admins — list admins for current user's chapter */
  static async listAdmins(req, res) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { code: 'AUTH_MISSING', message: 'Not authenticated' } });
      if (req.user.user_type !== 'ADMIN') return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } });

      const chapter_id = req.user.chapter_id;
      const admins = await UserRepository.findByChapter(chapter_id);
      res.json({ success: true, data: admins });
    } catch (err) {
      console.error('List admins error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list admins' } });
    }
  }

  /** POST /settings/admins — add an admin to current chapter */
  static async addAdmin(req, res) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { code: 'AUTH_MISSING', message: 'Not authenticated' } });
      if (req.user.user_type !== 'ADMIN') return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } });

      const chapter_id = req.user.chapter_id;
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'name, email and password are required' } });
      }

      // Create user as ADMIN within same chapter
      const user = await UserRepository.create({ chapter_id, user_type: 'ADMIN', name, email, password });
      const { password_hash, ...safe } = user;
      res.status(201).json({ success: true, data: safe });
    } catch (err) {
      console.error('Add admin error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to add admin' } });
    }
  }

  /** DELETE /settings/admins/:id — remove an admin from current chapter */
  static async removeAdmin(req, res) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { code: 'AUTH_MISSING', message: 'Not authenticated' } });
      if (req.user.user_type !== 'ADMIN') return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } });

      const chapter_id = req.user.chapter_id;
      const targetId = req.params.id;
      if (!targetId || typeof targetId !== 'string') return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Invalid user id' } });

      // Prevent deleting oneself (optional — change if desired)
      if (targetId === req.user.user_id) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Cannot remove yourself' } });
      }

      // Fetch the user to ensure same chapter and ADMIN type
      const target = await UserRepository.findById(targetId);
      if (!target) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      if (target.chapter_id !== chapter_id) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot remove admin from another chapter' } });
      if (target.user_type !== 'ADMIN') return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Target user is not an admin' } });

      const removed = await UserRepository.deleteById(targetId);
      res.json({ success: true, data: { removed_user_id: removed.user_id } });
    } catch (err) {
      console.error('Remove admin error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to remove admin' } });
    }
  }

  static async requestPasswordResetOtp(req, res) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { code: 'AUTH_MISSING', message: 'Not authenticated' } });
      const result = await AuthService.requestPasswordResetOtp(req.user.user_id);
      res.json({ success: true, data: result });
    } catch (err) {
      if (err.code === 'NOT_FOUND') return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: err.message } });
      if (err.code === 'EMAIL_NOT_CONFIGURED') return res.status(503).json({ success: false, error: { code: 'EMAIL_NOT_CONFIGURED', message: err.message } });
      if (err.code === 'EMAIL_SEND_FAILED') return res.status(503).json({ success: false, error: { code: 'EMAIL_SEND_FAILED', message: err.message } });
      console.error('Request password reset OTP error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to request OTP' } });
    }
  }

  static async resetPasswordWithOtp(req, res) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { code: 'AUTH_MISSING', message: 'Not authenticated' } });
      const { otp, new_password } = req.body;
      if (!otp || !new_password) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'otp and new_password are required' } });
      }
      if (String(new_password).length < 8) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'new_password must be at least 8 characters' } });
      }
      const result = await AuthService.resetPasswordWithOtp(req.user.user_id, otp, new_password);
      res.json({ success: true, data: result });
    } catch (err) {
      if (err.code === 'NOT_FOUND') return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: err.message } });
      if (err.code === 'INVALID_OTP') return res.status(400).json({ success: false, error: { code: 'INVALID_OTP', message: err.message } });
      if (err.code === 'INVALID_PASSWORD') return res.status(400).json({ success: false, error: { code: 'INVALID_PASSWORD', message: err.message } });
      console.error('Reset password with OTP error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to reset password' } });
    }
  }
  static async changePassword(req, res) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { code: 'AUTH_MISSING', message: 'Not authenticated' } });
      const { old_password, new_password } = req.body;
      if (!old_password || !new_password) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'old_password and new_password are required' } });
      }
      if (String(new_password).length < 8) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'new_password must be at least 8 characters' } });
      }
      const result = await AuthService.changePassword(req.user.user_id, old_password, new_password);
      res.json({ success: true, data: result });
    } catch (err) {
      if (err.code === 'NOT_FOUND') return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: err.message } });
      if (err.code === 'INVALID_PASSWORD') return res.status(400).json({ success: false, error: { code: 'INVALID_PASSWORD', message: err.message } });
      console.error('Change password error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to change password' } });
    }
  }

  /** GET /settings/partners — list partner users for current admin's chapter */
  static async listPartners(req, res) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { code: 'AUTH_MISSING', message: 'Not authenticated' } });
      if (req.user.user_type !== 'ADMIN') return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } });

      const chapter_id = req.user.chapter_id;
      const partners = await UserRepository.findPartnersByChapter(chapter_id);
      res.json({ success: true, data: partners });
    } catch (err) {
      console.error('List partners error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list partners' } });
    }
  }

  /** POST /settings/partners/:id/lock — lock partner user login */
  static async lockPartner(req, res) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { code: 'AUTH_MISSING', message: 'Not authenticated' } });
      if (req.user.user_type !== 'ADMIN') return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } });

      const chapter_id = req.user.chapter_id;
      const targetId = req.params.id;
      if (!targetId || typeof targetId !== 'string') return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Invalid user id' } });

      const target = await UserRepository.findById(targetId);
      if (!target) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      if (target.chapter_id !== chapter_id) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot lock partner from another chapter' } });
      if (target.user_type !== 'PARTNER') return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Target user is not a partner' } });

      await UserRepository.updateById(targetId, { is_active: false });
      res.json({ success: true, data: { user_id: targetId, is_active: false } });
    } catch (err) {
      console.error('Lock partner error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to lock partner user' } });
    }
  }

  /** POST /settings/partners/:id/unlock — unlock partner user login */
  static async unlockPartner(req, res) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { code: 'AUTH_MISSING', message: 'Not authenticated' } });
      if (req.user.user_type !== 'ADMIN') return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } });

      const chapter_id = req.user.chapter_id;
      const targetId = req.params.id;
      if (!targetId || typeof targetId !== 'string') return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Invalid user id' } });

      const target = await UserRepository.findById(targetId);
      if (!target) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      if (target.chapter_id !== chapter_id) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot unlock partner from another chapter' } });
      if (target.user_type !== 'PARTNER') return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Target user is not a partner' } });

      await UserRepository.updateById(targetId, { is_active: true });
      res.json({ success: true, data: { user_id: targetId, is_active: true } });
    } catch (err) {
      console.error('Unlock partner error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to unlock partner user' } });
    }
  }

  /** DELETE /settings/partners/:id — remove a partner user login only (partner record remains) */
  static async removePartner(req, res) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { code: 'AUTH_MISSING', message: 'Not authenticated' } });
      if (req.user.user_type !== 'ADMIN') return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } });

      const chapter_id = req.user.chapter_id;
      const targetId = req.params.id;
      if (!targetId || typeof targetId !== 'string') return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Invalid user id' } });

      // Fetch the user to ensure same chapter and PARTNER type
      const target = await UserRepository.findById(targetId);
      if (!target) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      if (target.chapter_id !== chapter_id) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot remove partner from another chapter' } });
      if (target.user_type !== 'PARTNER') return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Target user is not a partner' } });

      const removed = await UserRepository.deleteById(targetId);
      res.json({ success: true, data: { removed_user_id: removed.user_id } });
    } catch (err) {
      console.error('Remove partner error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to remove partner' } });
    }
  }
}

module.exports = { SettingsController };
