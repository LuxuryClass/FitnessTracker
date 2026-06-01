import { useRef } from 'react';
import { sceneProgress, useScrollFrame } from '../engine/ScrollEngine';
import { clamp } from '../engine/hooks';
import { Wordmark } from './Wordmark';
import styles from './Scene6Return.module.scss';

export function Scene6Return({ reducedMotion }: { reducedMotion: boolean }) {
  const contentRef = useRef<HTMLDivElement>(null);

  const ref = useScrollFrame((s, el) => {
    if (reducedMotion) return;
    const p = sceneProgress(el, s);
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
          <div className={styles.legal}>© FlameFitness · made with sweat</div>
        </div>
      </div>
    </section>
  );
}
