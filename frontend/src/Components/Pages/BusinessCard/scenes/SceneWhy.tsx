import { useRef, useState } from 'react';
import { sceneProgress, useScrollFrame } from '../engine/ScrollEngine';
import { clamp, mapRange } from '../engine/hooks';
import styles from './SceneWhy.module.scss';

/**
 * "Почему Flame" reimagined as an ignition thread: a vertical light line with
 * nodes that catch fire one-by-one as you scroll, each igniting a real reason.
 * It mirrors the whole card's metaphor — a match dragged down a wall, lighting
 * each thing as it passes.
 */

interface Reason {
  k: string;
  title: string;
  text: string;
  hero?: boolean;
}

const REASONS: Reason[] = [
  {
    k: 'noise',
    title: 'Ничего лишнего',
    text: 'Без ленты, лайков и рекламы. Только ты, штанга и сегодняшний подход.',
  },
  {
    k: 'auto',
    title: 'Считает за тебя',
    text: 'Объём в тоннах, серия недель и личные рекорды растут сами — ты просто тренируешься.',
  },
  {
    k: 'spark',
    title: 'Один подход в день',
    text: 'Маленькая искра каждый день складывается в инерцию, которую уже не остановить.',
    hero: true,
  },
  {
    k: 'balance',
    title: 'Виден баланс нагрузки',
    text: 'Видно, какие мышцы прокачаны, а какие отстают — перекосов больше не будет.',
  },
  {
    k: 'own',
    title: 'Твои данные — твои',
    text: 'Прогресс живёт у тебя, работает офлайн и не уходит на сторону.',
  },
];

export function SceneWhy({ reducedMotion }: { reducedMotion: boolean }) {
  const headRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const emberRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [, force] = useState(0);

  const ref = useScrollFrame((s, el) => {
    if (reducedMotion) {
      // light everything statically
      rowRefs.current.forEach((r) => r && r.style.setProperty('--lit', '1'));
      if (threadRef.current) threadRef.current.style.setProperty('--draw', '1');
      return;
    }
    const p = sceneProgress(el, s);
    const drift = (p - 0.5) * s.vh;
    if (headRef.current) headRef.current.style.transform = `translateY(${-drift * 0.1}px)`;
    if (listRef.current) listRef.current.style.transform = `translateY(${-drift * -0.04}px)`;
    el.style.setProperty('--op', `${clamp(mapRange(p, 0.06, 0.22, 0, 1) * mapRange(p, 0.96, 0.78, 0, 1))}`);

    // ignition progresses 0..1 across the middle of the scene
    const fire = clamp(mapRange(p, 0.2, 0.62, 0, 1));
    if (threadRef.current) threadRef.current.style.setProperty('--draw', `${fire}`);

    const n = REASONS.length;
    let lastLitCenter = 0;
    rowRefs.current.forEach((row, i) => {
      if (!row) return;
      // each node lights as the fire front passes its position
      const at = (i + 0.5) / n;
      const lit = clamp((fire - at) * 6 + 0.5); // soft step around `at`
      row.style.setProperty('--lit', `${lit}`);
      if (lit > 0.5) lastLitCenter = row.offsetTop + row.offsetHeight / 2;
    });

    // ember rides the fire front down the thread
    if (emberRef.current && listRef.current) {
      const total = listRef.current.offsetHeight;
      emberRef.current.style.transform = `translateY(${fire * total}px)`;
      emberRef.current.style.opacity = fire > 0.02 && fire < 0.98 ? '1' : '0';
      void lastLitCenter;
    }
  });

  // ensure a paint after mount so refs settle
  void force;

  return (
    <section ref={ref} className={`${styles.scene} ${reducedMotion ? styles.reduced : ''}`}>
      <div className={styles.frost}>
        <div ref={headRef} className={styles.head}>
          <span className={styles.kicker}>ПОЧЕМУ Flame Fitness</span>
          <h2 className={styles.title}>
            Трекер, который не <span className={styles.em}>гаснет</span> через неделю
          </h2>
        </div>

        <div className={styles.body}>
          <div className={styles.thread} ref={threadRef} aria-hidden="true">
            <span className={styles.threadFill} />
            <span className={styles.ember} ref={emberRef} />
          </div>

          <div className={styles.list} ref={listRef}>
            {REASONS.map((r, i) => (
              <div
                key={r.k}
                ref={(el) => { rowRefs.current[i] = el; }}
                className={`${styles.row} ${r.hero ? styles.hero : ''}`}
              >
                <span className={styles.node}>
                  <span className={styles.nodeCore} />
                  <span className={styles.nodeRing} />
                </span>
                <div className={styles.rowBody}>
                  <h3 className={styles.rowTitle}>{r.title}</h3>
                  <p className={styles.rowText}>{r.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
