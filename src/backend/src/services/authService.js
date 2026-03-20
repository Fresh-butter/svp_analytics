const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { config } = require('../config');
const { UserRepository } = require('../repositories');

class AuthService {
  static async login(email, password, chapter_id) {
    const user = await UserRepository.findByEmail(email, chapter_id);
    if (!user) return null;

    const valid = await UserRepository.verifyPassword(user, password);
    if (!valid) return null;

    const payload = {
      user_id: user.user_id,
      chapter_id: user.chapter_id,
      user_type: user.user_type,
    };

    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    });

    const { password_hash: _, ...safeUser } = user;
    return { token, user: safeUser };
  }

  static async forgotPassword(email) {
    const user = await UserRepository.findByEmail(email);
    if (!user) return null;

    if (!config.smtp.user || !config.smtp.pass) {
      throw new Error('Email service is not configured. Please contact your administrator.');
    }

    const newPassword = crypto.randomBytes(4).toString('hex');
    await UserRepository.updatePassword(user.user_id, newPassword);

    const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    });

    await transporter.sendMail({
      from: config.smtp.from,
      to: email,
      subject: 'SVP Analytics - Password Reset',
      html: `<h2>Password Reset</h2><p>Hi ${user.name},</p><p>Your password has been reset. Your new password is:</p><p style="font-size:18px;font-weight:bold;background:#f0f0f0;padding:12px;border-radius:6px;display:inline-block;">${newPassword}</p><p>Please log in and consider changing your password.</p><p>\u2014 SVP Analytics</p>`,
    });

    return true;
  }
}

module.exports = { AuthService };
