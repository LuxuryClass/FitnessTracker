import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollEngine } from '../engine/ScrollEngine';
import { useInstallPrompt } from '../useInstallPrompt';
import { InstallModal } from '../scenes/InstallModal';
import styles from './TopBar.module.scss';

// Сколько подсказка «Установи приложение» висит на экране
const HINT_SHOW_DELAY = 500;
const HINT_HIDE_DELAY = 6500;

// Иконка скачивания — стрелка вниз в подчёркивание
function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4v11M7.5 11l4.5 4.5L16.5 11M5 20h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Fixed CTA bar pinned to the very top of the card. Always reachable, never
 * scrolls away. Lives outside the scroller (like the progress rail).
 */
export function TopBar() {
  const navigate = useNavigate();
  const { subscribe } = useScrollEngine();
  const [modalOpen, setModalOpen] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const { isStandalone, isIos, canNativeInstall, promptInstall } =
    useInstallPrompt();

  // Подсказка у иконки: появляется после захода, исчезает по таймеру или при скролле
  useEffect(() => {
    if (isStandalone) return;
    const showTimer = setTimeout(() => setHintVisible(true), HINT_SHOW_DELAY);
    const hideTimer = setTimeout(() => setHintVisible(false), HINT_HIDE_DELAY);
    const unsubscribe = subscribe((s) => {
      if (s.raw > 40) setHintVisible(false);
    });
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      unsubscribe();
    };
  }, [isStandalone, subscribe]);

  const handleInstall = useCallback(() => {
    setHintVisible(false);
    // iOS не даёт нативного окна установки — показываем инструкцию;
    // на Chromium с пойманным beforeinstallprompt открываем нативный диалог
    if (!isIos && canNativeInstall) {
      void promptInstall();
      return;
    }
    setModalOpen(true);
  }, [isIos, canNativeInstall, promptInstall]);

  return (
    <div className={styles.bar}>
      {!isStandalone && (
        <div className={styles.installWrap}>
          <button
            type="button"
            className={`${styles.install} ${hintVisible ? styles.installPulse : ''}`}
            onClick={handleInstall}
            aria-label="Установить приложение"
          >
            <DownloadIcon />
            <span className={styles.installLabel}>Скачать</span>
          </button>
          <div
            className={`${styles.hint} ${hintVisible ? styles.hintVisible : ''}`}
            aria-hidden="true"
          >
            Для лучшего опыта советуем <br/> установить приложение
          </div>
        </div>
      )}
      <button
        type="button"
        className={styles.login}
        onClick={() => navigate('/login')}
      >
        Войти
      </button>
      <button
        type="button"
        className={styles.start}
        onClick={() => navigate('/register')}
      >
        Начать
        <span className={styles.arrow}>→</span>
      </button>
      <InstallModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        variant={isIos ? 'ios' : 'generic'}
      />
    </div>
  );
}
