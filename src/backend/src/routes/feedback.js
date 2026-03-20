const express = require('express');
const { FeedbackController } = require('../controllers/feedbackController');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

router.post('/', authenticate, FeedbackController.sendFeedback);

module.exports = router;
