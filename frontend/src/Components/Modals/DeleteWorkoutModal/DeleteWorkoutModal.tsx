import { memo, useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/Components/UI/Button/Button';
import styles from './Styles.module.scss';
import cn from 'classnames';

type DeleteScope = 'this' | 'following';

interface DeleteWorkoutModalProps {
  isOpen: boolean;
  isRepeating: boolean;
  isDeleting?: boolean;
  onClose: () => void;
  onConfirm: (scope: DeleteScope) => void;
}

const DeleteWorkoutModalComponent = ({
  isOpen,
  isRepeating,
  isDeleting = false,
  onClose,
  onConfirm,
}: DeleteWorkoutModalProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [scope, setScope] = useState<DeleteScope>('this');
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
      setScope('this');
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

        <div className={styles.header}>
          <h3 className={styles.title}>Удалить тренировку</h3>
          {isRepeating ? (
            <p className={styles.subtitle}>
              Эта тренировка повторяется.<br />Что удалить?
            </p>
          ) : (
            <p className={styles.subtitle}>Тренировку нельзя будет восстановить.</p>
          )}
        </div>

        {isRepeating && (
          <div className={styles.options}>
            <button
              type="button"
              className={cn(styles.optionCard, scope === 'this' && styles.optionCard_activeThis)}
              onClick={() => setScope('this')}
            >
              <span className={cn(styles.iconBadge, styles.iconBadge_this)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <path d="M3 9H21M8 2V6M16 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </span>
              <span className={styles.optionText}>
                <span className={styles.optionTitle}>Только эту</span>
                <span className={styles.optionDesc}>Удалить одну тренировку в выбранный день.</span>
              </span>
              <span className={cn(styles.radio, scope === 'this' && styles.radio_activeThis)} />
            </button>

            <button
              type="button"
              className={cn(styles.optionCard, scope === 'following' && styles.optionCard_activeFollowing)}
              onClick={() => setScope('following')}
            >
              <span className={cn(styles.iconBadge, styles.iconBadge_following)}>
                <img src="/icons/Repeat.svg" alt="" />
              </span>
              <span className={styles.optionText}>
                <span className={styles.optionTitle}>Эту и последующие</span>
                <span className={styles.optionDesc}>Удалить эту и все будущие тренировки в серии.</span>
              </span>
              <span className={cn(styles.radio, scope === 'following' && styles.radio_activeFollowing)} />
            </button>
          </div>
        )}

        <div className={styles.warning}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18A2 2 0 0 0 3.53 21H20.47A2 2 0 0 0 22.18 18L13.71 3.86A2 2 0 0 0 10.29 3.86Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Это действие нельзя отменить.</span>
        </div>

        <div className={styles.buttons}>
          <Button size="l" color="accent-2" onClick={handleClose} disabled={isDeleting}>
            Отмена
          </Button>
          <Button
            size="l"
            color="danger"
            onClick={() => onConfirm(isRepeating ? scope : 'this')}
            disabled={isDeleting}
          >
            {isDeleting ? 'Удаляем...' : 'Удалить'}
          </Button>
        </div>
      </div>
    </>
  );
};

export const DeleteWorkoutModal = memo(DeleteWorkoutModalComponent);