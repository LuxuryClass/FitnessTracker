import { useState } from 'react';
import { Wordmark } from '@/Components/Pages/BusinessCard/scenes/Wordmark';
import styles from './DesktopGate.module.scss';

const DISMISS_KEY = 'desktop-gate-dismissed';

// Десктоп определяем по способу ввода (мышь + hover), а не по ширине окна:
// телефоны/планшеты — pointer: coarse. Ширина ≥768px — страховка, чтобы
// эмуляция мобильного в DevTools не ловила оверлей
function detectDesktop(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(pointer: fine)').matches &&
    window.matchMedia('(hover: hover)').matches &&
    window.innerWidth >= 768
  );
}

function PhoneFrame() {
  return (
    <div className={styles.phone} aria-hidden="true">
      <div className={styles.phoneScreen}>
        <Wordmark size={26} lit className={styles.phoneMark} />
      </div>
      <div className={styles.phoneNotch} />
    </div>
  );
}

export function DesktopGate() {
  const [show, setShow] = useState(
    () => detectDesktop() && !localStorage.getItem(DISMISS_KEY)
  );
  const [closing, setClosing] = useState(false);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setClosing(true);
    setTimeout(() => setShow(false), 300);
  };

  return (
    <div className={`${styles.gate} ${closing ? styles.gateClosing : ''}`}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.content}>
        <PhoneFrame />
        <h1 className={styles.title}>Здесь удобнее с телефона</h1>
        <p className={styles.text}>
          FlameFitness создан для мобильных устройств — тренировки отмечают
          одной рукой, прямо в зале. Откройте сайт с телефона, чтобы получить
          лучший опыт.
        </p>
        <button type="button" className={styles.proceed} onClick={dismiss}>
          Всё равно продолжить с компьютера
        </button>
      </div>
      <div className={styles.legal}>© FlameTeam · made with sweat</div>
    </div>
  );
}