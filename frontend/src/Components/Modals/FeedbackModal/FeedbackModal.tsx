import { memo, useEffect, useState, useRef, useCallback } from 'react';
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
  const [dragOffset, setDragOffset] = useState(0);
  const startY = useRef(0);
  const isDragging = useRef(false);
  const currentDragOffset = useRef(0);
  const pendingFrameRef = useRef<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    emailjs.init({ publicKey: PUBLIC_KEY });
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setDragOffset(0);
      currentDragOffset.current = 0;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
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

  const handleClose = useCallback(() => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  }, [onClose]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    isDragging.current = true;
    startY.current = e.touches[0].clientY;
    modalRef.current?.classList.add(styles.modal_dragging);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    if (pendingFrameRef.current !== null) return;
    pendingFrameRef.current = requestAnimationFrame(() => {
      pendingFrameRef.current = null;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0) {
        currentDragOffset.current = delta;
        setDragOffset(delta);
      }
    });
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
    if (pendingFrameRef.current !== null) {
      cancelAnimationFrame(pendingFrameRef.current);
      pendingFrameRef.current = null;
    }
    modalRef.current?.classList.remove(styles.modal_dragging);
    if (currentDragOffset.current > 100) {
      handleClose();
    } else {
      setDragOffset(0);
      currentDragOffset.current = 0;
    }
  }, [handleClose]);

  if (!isVisible) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus('idle');

    try {
      const result = await emailjs.send(SERVICE_ID, TEMPLATE_ID, { name, email, message });
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

      <div
        ref={modalRef}
        className={cn(styles.modal, isAnimating && styles.modal_open)}
        style={{ '--drag-offset': `${dragOffset}px` } as React.CSSProperties}
      >
        <div
          className={styles.handleArea}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className={styles.handle} />
        </div>

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