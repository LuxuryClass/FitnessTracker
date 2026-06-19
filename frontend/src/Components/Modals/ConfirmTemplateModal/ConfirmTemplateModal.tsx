import { memo, useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/Components/UI/Button/Button';
import styles from './Styles.module.scss';
import cn from 'classnames';

interface ConfirmTemplateModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmTemplateModalComponent = ({
  isOpen,
  onConfirm,
  onCancel,
}: ConfirmTemplateModalProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const startY = useRef(0);
  const isDragging = useRef(false);
  const currentDragOffset = useRef(0);
  const pendingFrameRef = useRef<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

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
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsAnimating(false);
    setTimeout(() => {
      onCancel();
    }, 300);
  }, [onCancel]);

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

        <p className={styles.text}>
          Все текущие данные тренировки будут заменены на данные из шаблона. <br />Продолжить?
        </p>

        <div className={styles.buttons}>
          <Button size="l" color="accent-2" onClick={handleClose}>
            Отмена
          </Button>
          <Button size="l" color="primary" onClick={onConfirm}>
            Заменить
          </Button>
        </div>
      </div>
    </>
  );
};

export const ConfirmTemplateModal = memo(ConfirmTemplateModalComponent);