const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { config } = require('../config');
const { UserRepository } = require('../repositories');
const { setPasswordResetCode, verifyPasswordResetCode, clearPasswordResetCode } = require('./passwordResetStore');
const { validatePasswordStrength, passwordStrengthMessage } = require('../utils/passwordPolicy');

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

  static async requestPasswordReset(email, chapter_id) {
    const user = await UserRepository.findByEmail(email, chapter_id);
    if (!user) return null;

    if (!config.smtp.user || !config.smtp.pass) {
      throw new Error('Email service is not configured. Please contact your administrator.');
    }

    const resetCode = String(crypto.randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    setPasswordResetCode({
      chapter_id: user.chapter_id,
      email: user.email,
      code: resetCode,
      user_id: user.user_id,
      expiresAt,
    });

    const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    });

    await transporter.sendMail({
      from: config.smtp.from,
      to: email,
      subject: 'SVP Analytics - Password Reset Code',
      html: `<h2>Password Reset Code</h2><p>Hi ${user.name},</p><p>Your password reset verification code is:</p><p style="font-size:20px;font-weight:bold;letter-spacing:2px;background:#f0f0f0;padding:12px;border-radius:6px;display:inline-block;">${resetCode}</p><p>This code expires in 10 minutes.</p><p>— SVP Analytics</p>`,
    });

    return true;
  }

  static async resetPassword({ email, chapter_id, code, new_password }) {
    const user = await UserRepository.findByEmail(email, chapter_id);
    if (!user) return null;

    const record = verifyPasswordResetCode({ chapter_id: user.chapter_id, email: user.email, code });
    if (!record || record.user_id !== user.user_id) return null;

    if (!validatePasswordStrength(new_password)) {
      throw new Error(passwordStrengthMessage());
    }
    await UserRepository.updatePassword(user.user_id, new_password);
    clearPasswordResetCode(user.chapter_id, user.email);
    return true;
  }
}

module.exports = { AuthService };
