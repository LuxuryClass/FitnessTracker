import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './InstallModal.module.scss';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  // ios — пошаговая инструкция Safari; generic — установка через меню браузера
  variant: 'ios' | 'generic';
}

// Иконка «Поделиться» в Safari — квадрат со стрелкой вверх
function ShareIcon() {
  return (
    <svg className={styles.stepIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3v12M8 7l4-4 4 4M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Иконка «На экран “Домой”» — квадрат с плюсом
function AddToHomeIcon() {
  return (
    <svg className={styles.stepIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M12 8.5v7M8.5 12h7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

const IOS_STEPS = [
  {
    icon: <ShareIcon />,
    text: (
      <>
        Откройте сайт в <b>Safari</b> и нажмите кнопку <b>«Поделиться»</b> внизу
        экрана
      </>
    ),
  },
  {
    icon: <AddToHomeIcon />,
    text: (
      <>
        В списке выберите <b>«На экран “Домой”»</b>
      </>
    ),
  },
  {
    icon: null,
    text: (
      <>
        Нажмите <b>«Добавить»</b> — иконка появится на главном экране
      </>
    ),
  },
];

const GENERIC_STEPS = [
  {
    icon: null,
    text: (
      <>
        Откройте <b>меню браузера</b> (⋮ или ⋯ в углу экрана)
      </>
    ),
  },
  {
    icon: <AddToHomeIcon />,
    text: (
      <>
        Выберите <b>«Установить приложение»</b> или <b>«Добавить на главный
        экран»</b>
      </>
    ),
  },
  {
    icon: null,
    text: (
      <>
        Подтвердите — иконка появится на главном экране
      </>
    ),
  },
];

export function InstallModal({ isOpen, onClose, variant }: InstallModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Паттерн анимации как в LogoutModal: монтируем, на следующий кадр включаем transition
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

  const steps = variant === 'ios' ? IOS_STEPS : GENERIC_STEPS;

  // Портал в body: Scene6 анимируется инлайновым transform, внутри него fixed ломается
  return createPortal(
    <>
      <div
        className={`${styles.overlay} ${isAnimating ? styles.overlayVisible : ''}`}
        onClick={onClose}
      />
      <div
        className={`${styles.sheet} ${isAnimating ? styles.sheetOpen : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Установка приложения"
      >
        <div className={styles.handle} />
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Закрыть"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className={styles.glow} aria-hidden="true" />

        <h3 className={styles.title}>Установите FlameFitness</h3>
        <p className={styles.subtitle}>
          {variant === 'ios'
            ? 'Safari не показывает окно установки — добавьте приложение вручную, это три шага.'
            : 'Добавьте приложение на главный экран — оно будет работать как обычное.'}
        </p>

        <ol className={styles.steps}>
          {steps.map((step, i) => (
            <li key={i} className={styles.step}>
              <span className={styles.stepNum}>{i + 1}</span>
              <span className={styles.stepText}>{step.text}</span>
              {step.icon}
            </li>
          ))}
        </ol>

        <button type="button" className={styles.gotIt} onClick={onClose}>
          Понятно
        </button>
      </div>
    </>,
    document.body
  );
}