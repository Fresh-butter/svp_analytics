const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { config } = require('../config');
const { UserRepository, PartnerRepository } = require('../repositories');

class AuthService {
  static passwordOtpStore = new Map();

  static otpTtlMs = 10 * 60 * 1000;

  static generateOtp() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  static getOtpEntry(userId) {
    const entry = this.passwordOtpStore.get(userId);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.passwordOtpStore.delete(userId);
      return null;
    }
    return entry;
  }

  static async login(email, password, chapter_id) {
    const user = await UserRepository.findByEmail(email, chapter_id);
    if (!user) return null;

    if (user.user_type === 'PARTNER' && !(user.partner_id || user.partner?.partner_id)) {
      return null;
    }

    if (user.user_type === 'PARTNER' && user.is_active === false) {
      return { error: { code: 'PARTNER_INACTIVE', message: 'Account not activated. Please activate your account from the login page.' } };
    }

    const valid = await UserRepository.verifyPassword(user, password);
    if (!valid) return null;

    const payload = {
      user_id: user.user_id,
      chapter_id: user.chapter_id,
      user_type: user.user_type,
      partner_id: user.partner_id || user.partner?.partner_id || null,
    };

    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    });

    const { password_hash: _, partner: partnerAccount, ...safeUser } = user;
    if (partnerAccount) {
      safeUser.partner_id = partnerAccount.partner_id;
      safeUser.partner_name = partnerAccount.partner_name;
    } else if (user.partner_id) {
      safeUser.partner_id = user.partner_id;
    }
    return { token, user: safeUser };
  }

  static async requestPartnerActivation(email, chapter_id) {
    const partner = await PartnerRepository.findByEmail(email, chapter_id);
    if (!partner) {
      const error = new Error('Partner account does not exist for the selected chapter');
      error.code = 'NOT_FOUND';
      throw error;
    }

    const existingUser = await UserRepository.findByEmail(email, chapter_id);
    let user = existingUser;

    if (user && user.user_type !== 'PARTNER') {
      const error = new Error('This email is already registered to a non-partner account');
      error.code = 'VALIDATION';
      throw error;
    }

    if (!user) {
      const tempPassword = crypto.randomBytes(10).toString('base64url');
      user = await UserRepository.createPartnerLogin({
        chapter_id: partner.chapter_id,
        name: partner.partner_name,
        email: partner.email,
        partner_id: partner.partner_id,
        password: tempPassword,
      });
    } else if (!user.partner_id) {
      user = await UserRepository.updateById(user.user_id, { partner_id: partner.partner_id, name: partner.partner_name });
    }

    const activatedByFlag = typeof user.is_active === 'boolean' ? user.is_active === true : false;
    const noActivationFlagInSchema = typeof user.is_active !== 'boolean';
    const treatExistingAsActivated = noActivationFlagInSchema && !!existingUser;
    if (activatedByFlag || treatExistingAsActivated) {
      const error = new Error('Partner account is already activated');
      error.code = 'VALIDATION';
      throw error;
    }

    const generatedPassword = crypto.randomBytes(10).toString('base64url');
    await UserRepository.updatePassword(user.user_id, generatedPassword);
    await UserRepository.updateById(user.user_id, { is_active: true });

    if (!config.smtp.user || !config.smtp.pass) {
      if (config.nodeEnv !== 'production') {
        return { success: true, temporary_password: generatedPassword };
      }
      const error = new Error('Email service is not configured. Please contact your administrator.');
      error.code = 'EMAIL_NOT_CONFIGURED';
      throw error;
    }

    const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    });

    await transporter.sendMail({
      from: config.smtp.from,
      to: partner.email,
      subject: 'SVP Analytics - Partner Account Activated',
      html: `<h2>Account Activated</h2><p>Hello ${partner.partner_name},</p><p>Your partner account has been activated.</p><p>Your temporary password is:</p><p style="font-size:18px;font-weight:bold;background:#f0f0f0;padding:12px;border-radius:6px;display:inline-block;">${generatedPassword}</p><p>Please login and change/reset your password after first sign-in.</p>`,
      text: `Hello ${partner.partner_name},\n\nYour partner account has been activated.\nTemporary password: ${generatedPassword}\n\nPlease login and change/reset your password after first sign-in.`,
    });

    return { success: true };
  }

  static async requestPasswordResetOtp(userId) {
    const user = await UserRepository.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.code = 'NOT_FOUND';
      throw error;
    }

    const otp = this.generateOtp();
    this.passwordOtpStore.set(userId, {
      otp,
      expiresAt: Date.now() + this.otpTtlMs,
      attempts: 0,
    });

    if (!config.smtp.user || !config.smtp.pass) {
      if (config.nodeEnv !== 'production') {
        return { message: 'OTP generated for password reset.', otp };
      }
      const error = new Error('Email service is not configured. Please contact your administrator.');
      error.code = 'EMAIL_NOT_CONFIGURED';
      throw error;
    }

    const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    });

    await transporter.sendMail({
      from: config.smtp.from,
      to: user.email,
      subject: 'SVP Analytics - Password Reset OTP',
      html: `<h2>Password Reset OTP</h2><p>Hello ${user.name},</p><p>Your OTP is:</p><p style="font-size:22px;font-weight:bold;letter-spacing:2px;background:#f0f0f0;padding:12px;border-radius:6px;display:inline-block;">${otp}</p><p>This OTP expires in 10 minutes.</p>`,
      text: `Hello ${user.name},\n\nYour password reset OTP is: ${otp}\nThis OTP expires in 10 minutes.`,
    });

    return { message: 'OTP sent to your email.' };
  }

  static async resetPasswordWithOtp(userId, otp, newPassword) {
    const user = await UserRepository.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.code = 'NOT_FOUND';
      throw error;
    }

    const entry = this.getOtpEntry(userId);
    if (!entry) {
      const error = new Error('OTP expired or not requested');
      error.code = 'INVALID_OTP';
      throw error;
    }

    if (String(entry.otp) !== String(otp || '').trim()) {
      entry.attempts += 1;
      if (entry.attempts >= 5) {
        this.passwordOtpStore.delete(userId);
      } else {
        this.passwordOtpStore.set(userId, entry);
      }
      const error = new Error('Invalid OTP');
      error.code = 'INVALID_OTP';
      throw error;
    }

    await UserRepository.updatePassword(userId, newPassword);
    this.passwordOtpStore.delete(userId);
    return { message: 'Password reset successful.' };
  }

  static async completePartnerActivation(token, password) {
    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch {
      const error = new Error('Invalid or expired activation link');
      error.code = 'INVALID_TOKEN';
      throw error;
    }

    if (!payload || payload.purpose !== 'partner_activation') {
      const error = new Error('Invalid activation token');
      error.code = 'INVALID_TOKEN';
      throw error;
    }

    const user = await UserRepository.findById(payload.user_id);
    if (!user || user.user_type !== 'PARTNER') {
      const error = new Error('Partner account not found');
      error.code = 'NOT_FOUND';
      throw error;
    }

    await UserRepository.updatePassword(user.user_id, password);
    await UserRepository.updateById(user.user_id, { is_active: true });
    return true;
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
