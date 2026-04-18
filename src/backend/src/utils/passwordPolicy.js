function validatePasswordStrength(password) {
  if (typeof password !== 'string') return false;
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[^A-Za-z0-9]/.test(password)) return false;
  return true;
}

function passwordStrengthMessage() {
  return 'Password must be at least 8 characters and include at least one uppercase letter, one lowercase letter, one number, and one symbol';
}

module.exports = {
  validatePasswordStrength,
  passwordStrengthMessage,
};