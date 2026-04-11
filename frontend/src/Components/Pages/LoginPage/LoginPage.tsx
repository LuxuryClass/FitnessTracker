import { useNavigate, Link } from 'react-router-dom';
import styles from './Styles.module.scss';
import logo from '/Public/masscot-main.png';
import { Button } from '@/Components/UI/Button/Button';
import { AuthForm } from '@/Components/AuthForm/AuthForm';

const LoginPage = () => {
  const navigate = useNavigate();

  const handleLogin = (data: { email: string; password: string; name?: string }) => {
    console.log('Login:', data);
    navigate('/home');
  };

  return (
    <div className={styles.page}>
      <Link to="/enter">
        <Button className={styles.back__button} size="back" color="accent-2" type="button">
          <img src="/Public/ArrowBack.svg" alt="Назад" />
        </Button>
      </Link>
      
      <img className={styles.logo} src={logo} alt="logo" />
      <h1 className={styles.title}>С возвращением!</h1>
      <p className={styles.subtitle}>
        Войдите сейчас, чтобы получить доступ к персональным тренировкам.
      </p>

      <AuthForm type="login" onSubmit={handleLogin} />

      <div className={styles.footer}>
        Еще нет аккаунта?{' '}
        <Link className={styles.footer__signin_link} to="/register">Зарегистрироваться</Link>
      </div>
    </div>
  );
};

export default LoginPage;