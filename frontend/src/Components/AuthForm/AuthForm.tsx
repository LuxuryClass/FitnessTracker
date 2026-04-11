import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/Components/UI/Button/Button';
import { Input } from '@/Components/UI/Input/Input';
import messageIcon from '/Public/Message_light.svg';
import lockIcon from '/Public/Lock_alt_light.svg';
import userIcon from '/Public/User_light.svg';
import styles from './Styles.module.scss';
import { validateLoginForm, validateRegisterForm, isFormValid, type LoginErrors, type RegisterErrors } from '@/Utils/validation/validation';
import { clearFieldError } from '@/Utils/validation/helpers';

interface AuthFormProps {
  type: 'login' | 'register';
  onSubmit: (data: { email: string; password: string; name?: string }) => void;
}

export const AuthForm = ({ type, onSubmit }: AuthFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors = type === 'login' 
      ? validateLoginForm(email, password)
      : validateRegisterForm(email, password, name);
    
    setErrors(newErrors);
    
    if (!isFormValid(newErrors)) return;
    
    onSubmit({ email, password, ...(type === 'register' && { name }) });
  };

  const config = {
    login: {
      buttonText: 'Войти',
      showForgotLink: true,
      showNameField: false
    },
    register: {
      buttonText: 'Зарегистрироваться',
      showForgotLink: false,
      showNameField: true
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
        className={styles.form__submit_button}
      >
        {config.buttonText}
      </Button>
    </form>
  );
};