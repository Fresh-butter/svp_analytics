const express = require('express');
const { authenticate } = require('../middleware/auth');
const { SettingsController } = require('../controllers/settingsController');

const router = express.Router();

// All routes require authentication; controller checks admin role
router.get('/admins', authenticate, SettingsController.listAdmins);
router.post('/admins', authenticate, SettingsController.addAdmin);
router.delete('/admins/:id', authenticate, SettingsController.removeAdmin);

module.exports = router;
