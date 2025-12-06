/**
 * Email validation
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Phone number validation (Korean format)
 */
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^01[0-9]-?\d{3,4}-?\d{4}$/;
  return phoneRegex.test(phone);
};

/**
 * Password strength validation
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
export const isStrongPassword = (password: string): boolean => {
  if (password.length < 8) return false;

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  return hasUpperCase && hasLowerCase && hasNumber;
};

/**
 * Check if string is empty or whitespace only
 */
export const isEmpty = (str: string): boolean => {
  return !str || str.trim().length === 0;
};
