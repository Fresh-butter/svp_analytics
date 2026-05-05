const nodemailer = require('nodemailer');
const { config } = require('../config');

class FeedbackController {
  static async sendFeedback(req, res, next) {
    try {
      const { email, report } = req.body;

      if (!email || !report) {
        return res.status(400).json({ success: false, error: { message: 'Email and report are required.' } });
      }

      if (!config.smtp.user || !config.smtp.pass) {
        return res.status(503).json({
          success: false,
          error: { code: 'EMAIL_NOT_CONFIGURED', message: 'Email service is not configured. Please set SMTP_USER and SMTP_PASS.' },
        });
      }

      const transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.port === 465 || config.smtp.port === '465',
        auth: { user: config.smtp.user, pass: config.smtp.pass },
      });

      try {
        await transporter.verify();
      } catch {
        return res.status(503).json({
          success: false,
          error: { code: 'EMAIL_SEND_FAILED', message: 'Email service is unavailable. Please check SMTP settings.' },
        });
      }

      try {
        await transporter.sendMail({
          from: config.smtp.from,
          to: email,
          subject: 'SVP Analytics - Admin Feedback',
          text: report,
        });
      } catch {
        return res.status(503).json({
          success: false,
          error: { code: 'EMAIL_SEND_FAILED', message: 'Failed to send feedback email. Please verify SMTP credentials and retry.' },
        });
      }

      res.status(200).json({ success: true, data: { status: 'Feedback sent successfully' } });
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  }
}

module.exports = { FeedbackController };
