import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './Styles.module.scss';
import logo from '/masscot-main.png';
import { Button } from '@/Components/UI/Button/Button';
import { AuthForm } from '@/Components/AuthForm/AuthForm';
import { ApiError, useAuth } from '@/Auth';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleLogin = async (data: { email: string; password: string; name?: string }) => {
    setSubmitError('');
    setIsSubmitting(true);

    try {
      await login({
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });
      navigate('/home', { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
      } else if (error instanceof Error) {
        setSubmitError(error.message);
      } else {
        setSubmitError('Не удалось выполнить вход.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <Link to="/enter" className={styles.back__button}>
        <Button size="back" />
      </Link>
      
      <img className={styles.logo} src={logo} alt="logo" />
      <h1 className={styles.title}>С возвращением!</h1>
      <p className={styles.subtitle}>
        Войдите сейчас, чтобы получить доступ к персональным тренировкам.
      </p>

      <AuthForm type="login" onSubmit={handleLogin} isSubmitting={isSubmitting} serverError={submitError} />

      <div className={styles.footer}>
        Еще нет аккаунта?{' '}
        <Link className={styles.footer__signin_link} to="/register">Зарегистрироваться</Link>
      </div>
    </div>
  );
};

export default LoginPage;
