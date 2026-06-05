import { useEffect, useRef, useState } from 'react';
import { useScrollFrame } from '../engine/ScrollEngine';
import { Wordmark } from './Wordmark';
import styles from './Scene1Spark.module.scss';

const PILLS = ['Планируй', 'Составляй', 'Выполняй', 'Отслеживай'];
export function Scene1Spark({ reducedMotion }: { reducedMotion: boolean }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const [lit, setLit] = useState(reducedMotion);

  // cold open: light the coal shortly after mount
  useEffect(() => {
    if (reducedMotion) return;
    const t = setTimeout(() => setLit(true), 1400);
    return () => clearTimeout(t);
  }, [reducedMotion]);

  const ref = useScrollFrame((s) => {
    const content = contentRef.current;
    const hint = hintRef.current;
    if (reducedMotion) return;

    // Scene 1 sits at the top: key parallax to raw scroll (0 at rest) so nothing
    // is displaced on load.
    const sc = s.scroll;
    const vh = s.vh || 1;
    // прокрутили больше чем на экран — сцена вне вьюпорта, не трогаем DOM
    if (sc > vh * 1.05) return;
    const t = Math.min(1, sc / vh); // 0 at top, 1 after one viewport

    // content drifts up a hair faster than native + fades as it leaves
    if (content) {
      content.style.transform = `translateY(${-sc * 0.12}px)`;
      content.style.opacity = `${1 - t * 1.3}`;
    }
    // scroll hint fades the instant the user moves 40px
    if (hint) hint.style.opacity = sc > 40 ? '0' : '1';
  });

  return (
    <section
      ref={ref}
      className={`${styles.scene} ${reducedMotion ? styles.reduced : ''}`}
    >
      <div ref={contentRef} className={styles.content}>
        <Wordmark size={78} lit={lit} className={styles.mark} />
        <p className={styles.tagline}>
          Твой <span className={styles.taglineKey}>прогресс</span> в два клика<br />
        </p>

        <div className={styles.flow}>
          {PILLS.map((p, i) => (
            <span key={p} className={styles.flowItem}>
              <span className={styles.flowNum}>{`0${i + 1}`}</span>
              <span className={styles.flowLabel}>{p}</span>
            </span>
          ))}
        </div>
      </div>

      <div ref={hintRef} className={styles.hint} aria-hidden="true">
        <span className={styles.hintLabel}>листай</span>
        <svg width="18" height="26" viewBox="0 0 18 26" fill="none">
          <path d="M2 2 L9 9 L16 2" stroke="#9FDA16" strokeWidth="1" strokeLinecap="round" />
          <path d="M2 12 L9 19 L16 12" stroke="#9FDA16" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
        </svg>
      </div>
    </section>
  );
}
