export const validateEmail = (email: string): string => {
  if (!email) return 'Введите email';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Некорректный email';
  }
  return '';
};

export const validatePassword = (password: string): string => {
  if (!password) return 'Введите пароль';
  if (password.length < 6) return 'Не менее 6 символов';
  return '';
};

export interface LoginErrors {
  email: string;
  password: string;
  [key: string]: string;
}

export const validateLoginForm = (email: string, password: string): LoginErrors => {
  return {
    email: validateEmail(email),
    password: validatePassword(password)
  };
};

export const isFormValid = (errors: LoginErrors): boolean => {
  return !Object.values(errors).some(error => error !== '');
};

export interface RegisterErrors {
  email: string;
  password: string;
  [key: string]: string; 
}

export const validateName = (name: string): string => {
  if (!name) return 'Введите имя';
  if (name.length < 2) return 'Имя должно быть не менее 2 символов';
  return '';
};

export const validateRegisterForm = (email: string, password: string, name: string): RegisterErrors => {
  return {
    email: validateEmail(email),
    password: validatePassword(password),
    name: validateName(name)
  };
};

