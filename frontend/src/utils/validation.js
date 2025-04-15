// Email validation regex
const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

// Password validation regex (min 6 chars, at least one number)
const passwordRegex = /^(?=.*\d).{6,}$/;

export const validateLogin = (values) => {
  const errors = {};

  if (!values.email) {
    errors.email = 'Email is required';
  } else if (!emailRegex.test(values.email)) {
    errors.email = 'Invalid email format';
  }

  if (!values.password) {
    errors.password = 'Password is required';
  }

  return errors;
};

export const validateRegister = (values) => {
  const errors = {};

  if (!values.name) {
    errors.name = 'Name is required';
  }

  if (!values.email) {
    errors.email = 'Email is required';
  } else if (!emailRegex.test(values.email)) {
    errors.email = 'Invalid email format';
  }

  if (!values.password) {
    errors.password = 'Password is required';
  } else if (!passwordRegex.test(values.password)) {
    errors.password =
      'Password must be at least 6 characters long and contain at least one number';
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return errors;
};

export const validateForgotPassword = (values) => {
  const errors = {};

  if (!values.email) {
    errors.email = 'Email is required';
  } else if (!emailRegex.test(values.email)) {
    errors.email = 'Invalid email format';
  }

  return errors;
};

export const validateResetPassword = (values) => {
  const errors = {};

  if (!values.password) {
    errors.password = 'Password is required';
  } else if (!passwordRegex.test(values.password)) {
    errors.password =
      'Password must be at least 6 characters long and contain at least one number';
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return errors;
};

export const validateProfile = (values) => {
  const errors = {};

  if (!values.name) {
    errors.name = 'Name is required';
  }

  if (values.email && !emailRegex.test(values.email)) {
    errors.email = 'Invalid email format';
  }

  if (values.password && !passwordRegex.test(values.password)) {
    errors.password =
      'Password must be at least 6 characters long and contain at least one number';
  }

  if (values.password && !values.currentPassword) {
    errors.currentPassword = 'Current password is required to change password';
  }

  return errors;
};