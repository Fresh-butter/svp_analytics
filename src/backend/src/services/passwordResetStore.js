const crypto = require('crypto');

const resetCodes = new Map();

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function makeKey(chapter_id, email) {
  return `${chapter_id}:${normalizeEmail(email)}`;
}

function hashCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

function cleanupExpired() {
  const now = Date.now();
  for (const [key, record] of resetCodes.entries()) {
    if (record.expiresAt.getTime() <= now) {
      resetCodes.delete(key);
    }
  }
}

function setPasswordResetCode({ chapter_id, email, code, user_id, expiresAt }) {
  cleanupExpired();
  const key = makeKey(chapter_id, email);
  resetCodes.set(key, {
    user_id,
    email: normalizeEmail(email),
    codeHash: hashCode(code),
    expiresAt,
  });
}

function verifyPasswordResetCode({ chapter_id, email, code }) {
  cleanupExpired();
  const key = makeKey(chapter_id, email);
  const record = resetCodes.get(key);
  if (!record) return null;
  if (record.expiresAt.getTime() <= Date.now()) {
    resetCodes.delete(key);
    return null;
  }
  if (record.codeHash !== hashCode(code)) return null;
  return record;
}

function clearPasswordResetCode(chapter_id, email) {
  resetCodes.delete(makeKey(chapter_id, email));
}

module.exports = {
  setPasswordResetCode,
  verifyPasswordResetCode,
  clearPasswordResetCode,
};