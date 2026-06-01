import { useEffect, useRef } from 'react';
import { useScrollEngine } from '../engine/ScrollEngine';
import styles from './ProgressRail.module.scss';

const SCENES = 8;

export function ProgressRail({
  onJump,
}: {
  onJump: (sceneIndex: number) => void;
}) {
  const { subscribe } = useScrollEngine();
  const fillRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const idleTimer = useRef<number>(0);
  const ticksRef = useRef<(HTMLButtonElement | null)[]>([]);
  const lastProgress = useRef(0);

  useEffect(() => {
    return subscribe((s) => {
      const fill = fillRef.current;
      if (fill) fill.style.transform = `scaleY(${s.progress})`;

      // active tick glow
      const active = Math.min(SCENES - 1, Math.round(s.progress * (SCENES - 1)));
      ticksRef.current.forEach((t, i) => {
        if (t) t.dataset.active = i === active ? 'true' : 'false';
      });

      // show on movement, fade after 800ms idle
      if (Math.abs(s.progress - lastProgress.current) > 0.0005) {
        lastProgress.current = s.progress;
        const rail = railRef.current;
        if (rail) {
          rail.dataset.visible = 'true';
          window.clearTimeout(idleTimer.current);
          idleTimer.current = window.setTimeout(() => {
            rail.dataset.visible = 'false';
          }, 800);
        }
      }
    });
  }, [subscribe]);

  return (
    <div className={styles.rail} ref={railRef} data-visible="true" aria-hidden="true">
      <div className={styles.track} />
      <div className={styles.fill} ref={fillRef} />
      <div className={styles.ticks}>
        {Array.from({ length: SCENES }).map((_, i) => (
          <button
            key={i}
            type="button"
            className={styles.tick}
            data-active={i === 0 ? 'true' : 'false'}
            ref={(el) => {
              ticksRef.current[i] = el;
            }}
            onClick={() => onJump(i)}
            aria-label={`Перейти к сцене ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
