const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateAuthFields({ email = '', password = '', name = '', isSignup = false }) {
  const errors = {};

  if (isSignup && !name.trim()) errors.name = 'Enter your full name.';

  if (!email.trim()) errors.email = 'Enter your email address.';
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address.';

  if (!password) errors.password = 'Enter your password.';
  else if (password.length < 6) errors.password = 'Password must be at least 6 characters.';

  return errors;
}
