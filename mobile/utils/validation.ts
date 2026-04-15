const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

const hasUpperCase = (value: string): boolean => /[A-Z]/.test(value);
const hasLowerCase = (value: string): boolean => /[a-z]/.test(value);
const hasDigit = (value: string): boolean => /\d/.test(value);

export const validateLoginInput = (email: string, password: string): string | null => {
  const normalizedEmail = email.trim();

  if (!normalizedEmail || !password) {
    return "Email and password are required.";
  }

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return "Enter a valid email address.";
  }

  return null;
};

export const validateRegisterInput = (name: string, email: string, password: string): string | null => {
  const normalizedName = name.trim();
  const normalizedEmail = email.trim();

  if (!normalizedName || !normalizedEmail || !password) {
    return "Name, email, and password are required.";
  }

  if (normalizedName.length < 2) {
    return "Name must be at least 2 characters.";
  }

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return "Enter a valid email address.";
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return "Password must be at least 8 characters.";
  }

  if (!hasUpperCase(password) || !hasLowerCase(password) || !hasDigit(password)) {
    return "Password must include uppercase, lowercase, and a number.";
  }

  return null;
};
