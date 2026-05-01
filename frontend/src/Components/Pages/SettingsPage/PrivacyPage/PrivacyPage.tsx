import { useState } from 'react';
import { Button } from '@/Components/UI/Button/Button';
import { Toggle } from '@/Components/UI/Toggle/Toggle';
import { Input } from '@/Components/UI/Input/Input';
import { validatePassword } from '@/Utils/validation/validation';
import styles from './Styles.module.scss';
import cn from 'classnames';

const PrivacyPage = () => {
  const [collectData, setCollectData] = useState(true);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({ password: '', repeatPassword: '' });

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
  };

  const handleRepeatPasswordChange = (value: string) => {
    setRepeatPassword(value);
    if (errors.repeatPassword) setErrors(prev => ({ ...prev, repeatPassword: '' }));
  };

  const validate = () => {
    const newErrors = {
      password: validatePassword(password),
      repeatPassword: '',
    };

    if (!newErrors.password && !repeatPassword) {
      newErrors.repeatPassword = 'Повторите пароль';
    } else if (!newErrors.password && password !== repeatPassword) {
      newErrors.repeatPassword = 'Пароли не совпадают';
    }

    setErrors(newErrors);
    return !newErrors.password && !newErrors.repeatPassword;
  };

  const handleChangePassword = async () => {
    if (!validate()) return;
    
    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsChangePasswordOpen(false);
      setPassword('');
      setRepeatPassword('');
      setErrors({ password: '', repeatPassword: '' });
    } catch (error) {
      console.error('Ошибка:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button size="back" />
        <h1 className={styles.title}>Конфиденциальность</h1>
      </div>

      <div className={styles.list}>
        <div className={styles.item}>
          <div className={styles.itemInfo}>
            <span className={styles.itemLabel}>Сбор данных</span>
            <span className={styles.itemHint}>Собирать данные для аналитики</span>
          </div>
          <Toggle checked={collectData} onChange={setCollectData} />
        </div>

        <div 
          className={cn(
            styles.item, 
            styles.item_clickable,
            isChangePasswordOpen && styles.item_clickable_open
          )}
          onClick={() => setIsChangePasswordOpen(!isChangePasswordOpen)}
        >
          <span className={styles.itemLabel}>Сменить пароль</span>
          <svg 
            className={cn(styles.chevron, isChangePasswordOpen && styles.chevron_open)} 
            width="20" height="20" viewBox="0 0 24 24" fill="none"
          >
            <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Блок всегда в DOM, анимация через CSS */}
        <div className={cn(styles.passwordBlock, isChangePasswordOpen && styles.passwordBlock_open)}>
          <div className={styles.passwordInner}>
            <Input
              type="password"
              value={password}
              onChange={handlePasswordChange}
              placeholder="Новый пароль"
              className={styles.passwordInput}
              error={errors.password}
            />
            
            <Input
              type="password"
              value={repeatPassword}
              onChange={handleRepeatPasswordChange}
              placeholder="Повторите новый пароль"
              className={styles.passwordInput}
              error={errors.repeatPassword}
            />

            <Button
              size="l"
              color="primary"
              fullWidth
              onClick={handleChangePassword}
              disabled={isSubmitting}
              className={styles.passwordButton}
            >
              {isSubmitting ? 'Смена...' : 'Сменить пароль'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;