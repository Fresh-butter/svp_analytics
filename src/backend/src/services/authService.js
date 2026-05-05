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

  static validatePasswordSimple(password) {
    if (typeof password !== 'string' || password.length < 8) {
      const error = new Error('Password must be at least 8 characters long');
      error.code = 'INVALID_PASSWORD';
      throw error;
    }
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

  static async getVerifiedTransporter() {
    if (!config.smtp.user || !config.smtp.pass) {
      const error = new Error('Email service is not configured. Please set SMTP_USER and SMTP_PASS.');
      error.code = 'EMAIL_NOT_CONFIGURED';
      throw error;
    }

    const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    });

    try {
      await transporter.verify();
    } catch {
      const error = new Error('Email service is unavailable. Please check SMTP settings.');
      error.code = 'EMAIL_SEND_FAILED';
      throw error;
    }

    return transporter;
  }

  static async sendPasswordResetOtpEmail(user) {
    const otp = this.generateOtp();
    this.passwordOtpStore.set(user.user_id, {
      otp,
      expiresAt: Date.now() + this.otpTtlMs,
      attempts: 0,
    });

    const transporter = await this.getVerifiedTransporter();

    try {
      await transporter.sendMail({
        from: config.smtp.from,
        to: user.email,
        subject: 'SVP Analytics - Password Reset OTP',
        html: `<h2>Password Reset OTP</h2><p>Hello ${user.name},</p><p>Your OTP is:</p><p style="font-size:22px;font-weight:bold;letter-spacing:2px;background:#f0f0f0;padding:12px;border-radius:6px;display:inline-block;">${otp}</p><p>This OTP expires in 10 minutes.</p>`,
        text: `Hello ${user.name},\n\nYour password reset OTP is: ${otp}\nThis OTP expires in 10 minutes.`,
      });
    } catch {
      const error = new Error('Failed to send password reset OTP email. Please verify SMTP credentials and retry.');
      error.code = 'EMAIL_SEND_FAILED';
      throw error;
    }
  }

  static async sendPartnerTemporaryPasswordEmail(user, temporaryPassword) {
    const transporter = await this.getVerifiedTransporter();

    try {
      await transporter.sendMail({
        from: config.smtp.from,
        to: user.email,
        subject: 'SVP Analytics - Temporary Password',
        html: `<h2>Partner Account Registered</h2><p>Hello ${user.name},</p><p>Your partner login has been created. Use this temporary password to sign in:</p><p style="font-size:22px;font-weight:bold;letter-spacing:1px;background:#f0f0f0;padding:12px;border-radius:6px;display:inline-block;">${temporaryPassword}</p><p>For security, please reset your password after logging in.</p>`,
        text: `Hello ${user.name},\n\nYour partner login has been created. Your temporary password is: ${temporaryPassword}\n\nFor security, please reset your password after logging in.`,
      });
    } catch {
      const error = new Error('Failed to send temporary password email. Please verify SMTP credentials and retry.');
      error.code = 'EMAIL_SEND_FAILED';
      throw error;
    }
  }

  static async login(email, password, chapter_id) {
    const user = await UserRepository.findByEmail(email, chapter_id);
    if (!user) {
      // If chapter is provided, detect when credentials are valid in another chapter.
      if (chapter_id) {
        const accounts = await UserRepository.findAllByEmail(email);
        for (const account of accounts) {
          const valid = await UserRepository.verifyPassword(account, password);
          if (valid) {
            return {
              error: {
                code: 'CHAPTER_MISMATCH',
                message: 'Account found, but not in selected chapter. Please choose the correct chapter and try again.',
              },
            };
          }
        }
      }
      return null;
    }

    if (user.user_type === 'PARTNER' && !(user.partner_id || user.partner?.partner_id)) {
      return null;
    }

    if (user.user_type === 'PARTNER' && user.is_active === false) {
      return { error: { code: 'PARTNER_LOCKED', message: 'Partner account is locked. Please contact your chapter admin.' } };
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

  static async requestPartnerRegistration(email, chapter_id) {
    const partner = await PartnerRepository.findByEmail(email, chapter_id);
    if (!partner) {
      const error = new Error('Partner account does not exist for the selected chapter');
      error.code = 'NOT_FOUND';
      throw error;
    }

    const existingUser = await UserRepository.findByEmail(email, chapter_id);
    if (existingUser && existingUser.user_type !== 'PARTNER') {
      const error = new Error('This email is already registered to a non-partner account');
      error.code = 'VALIDATION';
      throw error;
    }

    // Prevent locked users from re-registering
    if (existingUser && existingUser.is_active === false) {
      const error = new Error('Partner account is currently locked and cannot be re-registered');
      error.code = 'LOCKED';
      throw error;
    }

    if (existingUser) {
      const error = new Error('Partner account is already registered');
      error.code = 'VALIDATION';
      throw error;
    }

    const temporaryPassword = crypto.randomBytes(10).toString('base64url');
    let user = await UserRepository.createPartnerLogin({
      chapter_id: partner.chapter_id,
      name: partner.partner_name,
      email: partner.email,
      partner_id: partner.partner_id,
      password: temporaryPassword,
    });

    // First-time registration should allow immediate login with temporary password.
    user = await UserRepository.updateById(user.user_id, { is_active: true });
    await this.sendPartnerTemporaryPasswordEmail(user, temporaryPassword);

    return { success: true };
  }

  static async requestPasswordResetOtp(userId) {
    const user = await UserRepository.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.code = 'NOT_FOUND';
      throw error;
    }

    await this.sendPasswordResetOtpEmail(user);
    return { message: 'OTP sent to your email.' };
  }

  static async resetPasswordWithOtp(userId, otp, newPassword) {
    this.validatePasswordSimple(newPassword);

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

  static async changePassword(userId, oldPassword, newPassword) {
    this.validatePasswordSimple(newPassword);

    if (oldPassword === newPassword) {
      const error = new Error('New password cannot be the same as your old password');
      error.code = 'INVALID_PASSWORD';
      throw error;
    }

    const user = await UserRepository.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.code = 'NOT_FOUND';
      throw error;
    }

    const valid = await UserRepository.verifyPassword(user, oldPassword);
    if (!valid) {
      const error = new Error('Incorrect old password');
      error.code = 'INVALID_PASSWORD';
      throw error;
    }

    await UserRepository.updatePassword(userId, newPassword);
    return { message: 'Password updated successfully.' };
  }



  static async forgotPassword(email) {
    const user = await UserRepository.findByEmail(email);
    if (!user) return null;

    await this.sendPasswordResetOtpEmail(user);
    return true;
  }

  static async completeForgotPassword(email, otp, password) {
    this.validatePasswordSimple(password);

    const user = await UserRepository.findByEmail(email);
    if (!user) {
      const error = new Error('Invalid OTP');
      error.code = 'INVALID_OTP';
      throw error;
    }

    await this.resetPasswordWithOtp(user.user_id, otp, password);
    return true;
  }
}

module.exports = { AuthService };
