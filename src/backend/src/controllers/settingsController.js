const { UserRepository } = require('../repositories');
const { validatePasswordStrength, passwordStrengthMessage } = require('../utils/passwordPolicy');

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
      if (!validatePasswordStrength(password)) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: passwordStrengthMessage() } });
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
}

module.exports = { SettingsController };
