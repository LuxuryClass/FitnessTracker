import { useNavigate, Link } from 'react-router-dom';
import styles from './Styles.module.scss';
import logo from '/Public/masscot-main.png';
import arrowBack from '/Public/ArrowBack.svg';
import { Button } from '@/Components/UI/Button/Button';
import { AuthForm } from '@/Components/AuthForm/AuthForm';

const RegisterPage = () => {
  const navigate = useNavigate();

  const handleLogin = (data: { email: string; password: string; name?: string }) => {
    console.log('Login:', data);
    navigate('/home');
  };

  return (
    <div className={styles.page}>
      <Link to="/enter">
        <Button className={styles.back__button} size="back" color="accent-2" type="button">
          <img src={arrowBack} alt="Назад" />
        </Button>
      </Link>
      
      <img className={styles.logo} src={logo} alt="logo" />
      <h1 className={styles.title}>Создать аккаунт</h1>
      <p className={styles.subtitle}>
        Тренируйтесь по персональному плану и <br/>достигайте целей      
      </p>

      <AuthForm type="register" onSubmit={handleLogin} />

      <div className={styles.footer}>
        Уже есть аккаунт?{' '}
        <Link className={styles.footer__signin_link} to="/login">Войти</Link>
      </div>
    </div>
  );
};

export default RegisterPage;