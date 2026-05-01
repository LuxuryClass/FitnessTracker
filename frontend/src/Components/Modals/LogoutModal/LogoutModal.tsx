import { memo, useEffect, useState } from 'react';
import { Button } from '@/Components/UI/Button/Button';
import styles from './Styles.module.scss';
import cn from 'classnames';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoggingOut?: boolean;
}

const LogoutModalComponent = ({ isOpen, onClose, onConfirm, isLoggingOut }: LogoutModalProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Запускаем анимацию появления в следующем кадре
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      // Ждём окончания анимации перед скрытием
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isVisible) return null;

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <>
      {/* Оверлей */}
      <div 
        className={cn(styles.overlay, isAnimating && styles.overlay_visible)}
        onClick={handleClose}
      />
      
      {/* Попап */}
      <div className={cn(styles.modal, isAnimating && styles.modal_open)}>
        <div className={styles.handle} />
        
        <p className={styles.text}>Вы уверены что хотите выйти?</p>
        
        <div className={styles.buttons}>
          <Button
            size="l"
            color="accent-2"
            onClick={handleClose}
            className={styles.cancelButton}
          >
            Назад
          </Button>
          <Button
            size="l"
            color="primary"
            onClick={onConfirm}
            disabled={isLoggingOut}
            className={styles.confirmButton}
          >
            {isLoggingOut ? 'Выход...' : 'Да, выйти'}
          </Button>
        </div>
      </div>
    </>
  );
};

export const LogoutModal = memo(LogoutModalComponent);