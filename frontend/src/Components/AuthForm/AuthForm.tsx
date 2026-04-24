import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/Components/UI/Button/Button';
import { Input } from '@/Components/UI/Input/Input';
import messageIcon from '/Message_light.svg';
import lockIcon from '/Lock_alt_light.svg';
import styles from './Styles.module.scss';
import { validateLoginForm, validateRegisterForm, isFormValid, type LoginErrors, type RegisterErrors } from '@/Utils/validation/validation';
import { clearFieldError } from '@/Utils/validation/helpers';

interface AuthFormProps {
  type: 'login' | 'register';
  onSubmit: (data: { email: string; password: string; name?: string }) => Promise<void> | void;
  isSubmitting?: boolean;
  serverError?: string;
}

const buildDerivedName = (emailValue: string): string => {
  const emailLocalPart = emailValue.trim().split('@')[0]?.replace(/\s+/g, '') ?? '';
  if (emailLocalPart.length >= 3) {
    return emailLocalPart;
  }

  const fallback = `${emailLocalPart}user`;
  return fallback.length >= 3 ? fallback : 'user123';
};

export const AuthForm = ({ type, onSubmit, isSubmitting = false, serverError = '' }: AuthFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginErrors | RegisterErrors>({ 
    email: '', 
    password: '', 
    ...(type === 'register' && { name: '' }) 
  });

  const handleEmailChange = (value: string) => {
    setEmail(value);
    clearFieldError(errors, 'email', setErrors);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    clearFieldError(errors, 'password', setErrors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const derivedName = buildDerivedName(email);
    
    const newErrors = type === 'login' 
      ? validateLoginForm(email, password)
      : validateRegisterForm(email, password, derivedName);
    
    setErrors(newErrors);
    
    if (!isFormValid(newErrors)) return;
    
    await onSubmit({ email, password, ...(type === 'register' && { name: derivedName }) });
  };

  const config = {
    login: {
      buttonText: 'Войти',
      showForgotLink: true
    },
    register: {
      buttonText: 'Зарегистрироваться',
      showForgotLink: false
    }
  }[type];

  return (
    <form className={styles.form} onSubmit={handleSubmit}>          
      <div className={styles.form__inputs}>
        <Input
          type="text"
          placeholder="Example@gmail.com"
          value={email}
          onChange={handleEmailChange}
          error={errors.email}
          disabled={isSubmitting}
          className={styles.form__inputs__input_wrapper}
          inputStyles={styles.form__inputs__input}
          icon={messageIcon}
        />

        <Input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={handlePasswordChange}
          error={errors.password}
          disabled={isSubmitting}
          className={styles.form__inputs__input_wrapper}
          inputStyles={styles.form__inputs__input}
          icon={lockIcon}
        />
      </div>

      {config.showForgotLink && (
        <Link className={styles.form__forgot} to="/forgot-password">Забыли пароль?</Link>
      )}
      
      <Button
        type="submit"
        size="l"
        color="primary"
        fullWidth
        disabled={isSubmitting}
        className={styles.form__submit_button}
      >
        {isSubmitting ? 'Подождите...' : config.buttonText}
      </Button>

      {serverError && <p className={styles.form__server_error}>{serverError}</p>}
    </form>
  );
};
