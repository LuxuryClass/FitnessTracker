import { memo, useEffect, useState } from 'react';
import emailjs from '@emailjs/browser';
import { Button } from '@/Components/UI/Button/Button';
import { Input } from '@/Components/UI/Input/Input';
import styles from './Styles.module.scss';
import cn from 'classnames';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FeedbackModalComponent = ({ isOpen, onClose }: FeedbackModalProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Инициализация EmailJS при монтировании компонента
  useEffect(() => {
    emailjs.init({ publicKey: PUBLIC_KEY });
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsAnimating(true));
      });
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setName('');
        setEmail('');
        setMessage('');
        setStatus('idle');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus('idle');

    try {
      const result = await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        { name, email, message }
        // publicKey не передаём, так как уже сделали init
      );
      console.log('EmailJS success:', result);
      setStatus('success');
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      console.error('EmailJS error:', error);
      setStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div
        className={cn(styles.overlay, isAnimating && styles.overlay_visible)}
        onClick={handleClose}
      />
      <div className={cn(styles.modal, isAnimating && styles.modal_open)}>
        <div className={styles.handle} />
        <h3 className={styles.title}>Обратная связь</h3>
        <p className={styles.subtitle}>
          Напишите нам о проблемах, идеях или пожеланиях
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            type="text"
            value={name}
            onChange={setName}
            placeholder="Ваше имя"
            className={styles.field}
            isRequired
          />
          <Input
            type="text"
            value={email}
            onChange={setEmail}
            placeholder="Email для ответа"
            className={styles.field}
            isRequired
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Сообщение"
            className={styles.textarea}
            required
            rows={4}
          />

          {status === 'success' && (
            <p className={styles.success}>Спасибо! Мы получили ваше сообщение.</p>
          )}
          {status === 'error' && (
            <p className={styles.error}>Ошибка отправки. Попробуйте позже.</p>
          )}

          <div className={styles.buttons}>
            <Button size="l" color="accent-2" onClick={handleClose}>
              Отмена
            </Button>
            <Button size="l" color="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Отправка...' : 'Отправить'}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};

export const FeedbackModal = memo(FeedbackModalComponent);