import { useCallback, useRef, useState } from 'react';
import { sceneProgress, useScrollFrame } from '../engine/ScrollEngine';
import { clamp } from '../engine/hooks';
import { useInstallPrompt } from '../useInstallPrompt';
import { Wordmark } from './Wordmark';
import { InstallModal } from './InstallModal';
import styles from './Scene6Return.module.scss';

// Иконка скачивания — стрелка вниз в подчёркивание
function DownloadIcon() {
  return (
    <svg className={styles.installIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

export function Scene6Return({ reducedMotion }: { reducedMotion: boolean }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { isStandalone, isIos, canNativeInstall, promptInstall } =
    useInstallPrompt();

  const handleInstall = useCallback(() => {
    // iOS не даёт нативного окна установки — показываем инструкцию;
    // на Chromium с пойманным beforeinstallprompt открываем нативный диалог
    if (!isIos && canNativeInstall) {
      void promptInstall();
      return;
    }
    setModalOpen(true);
  }, [isIos, canNativeInstall, promptInstall]);

  const ref = useScrollFrame((s, el) => {
    if (reducedMotion) return;
    const p = sceneProgress(el, s);
    // сцена полностью вне вьюпорта — не трогаем DOM, чтобы не грязнить стиль
    if (p <= 0 || p >= 1) return;
    const gather = clamp(p / 0.6);
    if (contentRef.current) {
      const rise = (1 - gather) * 16;
      contentRef.current.style.transform = `translateY(${rise}px)`;
      contentRef.current.style.opacity = `${gather}`;
    }
  });

  return (
    <section ref={ref} className={styles.scene}>
      <div className={styles.inner}>
        <div ref={contentRef} className={styles.content}>
          <Wordmark size={44} lit className={styles.mark} />
          <p className={styles.outro}>
            Начни сегодня — одна искра, и инерция сделает остальное.
          </p>
          {!isStandalone && (
            <button
              type="button"
              className={styles.install}
              onClick={handleInstall}
            >
              <DownloadIcon />
              Установить приложение
            </button>
          )}
          <div className={styles.legal}>© FlameTeam · made with sweat</div>
        </div>
      </div>
      <InstallModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        variant={isIos ? 'ios' : 'generic'}
      />
    </section>
  );
}
