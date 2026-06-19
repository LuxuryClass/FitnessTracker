import { memo, useEffect, useState } from 'react';
import { Button } from '@/Components/UI/Button/Button';
import styles from './Styles.module.scss';
import cn from 'classnames';

interface ExitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFinish: () => void;
  onExit: () => void;
  isFinishing?: boolean;
}

const ExitModalComponent = ({ isOpen, onClose, onFinish, onExit, isFinishing }: ExitModalProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
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
      <div className={cn(styles.overlay, isAnimating && styles.overlay_visible)} onClick={handleClose} />
      <div className={cn(styles.modal, isAnimating && styles.modal_open)}>
        <div className={styles.handle} />
        <p className={styles.text}>Вы уверены, что хотите выйти?</p>
        <div className={styles.buttons}>
          <Button size="l" color="primary" onClick={onFinish} disabled={isFinishing} className={styles.finishButton}>
            {isFinishing ? 'Завершаем...' : 'Завершить тренировку'}
          </Button>
          <Button size="l" color="accent-2" onClick={onExit} className={styles.exitButton}>
            Выйти без сохранения
          </Button>
        </div>
      </div>
    </>
  );
};

export const ExitModal = memo(ExitModalComponent);