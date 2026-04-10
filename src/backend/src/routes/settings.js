const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { SettingsController } = require('../controllers/settingsController');

const router = express.Router();

// All routes require authentication; controller checks admin role
router.get('/admins', authenticate, requireAdmin, SettingsController.listAdmins);
router.post('/admins', authenticate, requireAdmin, SettingsController.addAdmin);
router.delete('/admins/:id', authenticate, requireAdmin, SettingsController.removeAdmin);
router.post('/password-reset/request-otp', authenticate, SettingsController.requestPasswordResetOtp);
router.post('/password-reset/confirm', authenticate, SettingsController.resetPasswordWithOtp);

module.exports = router;
