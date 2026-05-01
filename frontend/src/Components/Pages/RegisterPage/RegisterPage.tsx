import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './Styles.module.scss';
import logo from '/masscot-main.png';
import { Button } from '@/Components/UI/Button/Button';
import { AuthForm } from '@/Components/AuthForm/AuthForm';
import { ApiError, useAuth } from '@/Auth';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleRegister = async (data: { email: string; password: string; name?: string }) => {
    setSubmitError('');

    const normalizedEmail = data.email.trim().toLowerCase();
    const emailLocalPart = normalizedEmail.split('@')[0]?.replace(/\s+/g, '') ?? '';
    const username = data.name?.trim() || (emailLocalPart.length >= 3 ? emailLocalPart : `${emailLocalPart}user`);

    setIsSubmitting(true);

    try {
      await register({
        email: normalizedEmail,
        password: data.password,
        username,
      });
      navigate('/home', { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
      } else if (error instanceof Error) {
        setSubmitError(error.message);
      } else {
        setSubmitError('Не удалось выполнить регистрацию.');
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
      <h1 className={styles.title}>Создать аккаунт</h1>
      <p className={styles.subtitle}>
        Тренируйтесь по персональному плану и <br/>достигайте целей      
      </p>

      <AuthForm type="register" onSubmit={handleRegister} isSubmitting={isSubmitting} serverError={submitError} />

      <div className={styles.footer}>
        Уже есть аккаунт?{' '}
        <Link className={styles.footer__signin_link} to="/login">Войти</Link>
      </div>
    </div>
  );
};

export default RegisterPage;