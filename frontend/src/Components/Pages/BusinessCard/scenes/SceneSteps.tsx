import { useRef } from 'react';
import { sceneProgress, useScrollFrame } from '../engine/ScrollEngine';
import { clamp } from '../engine/hooks';
import { MascotShot, type MascotStage } from './MascotShot';
import styles from './SceneSteps.module.scss';

const STEPS: {
  n: string;
  title: string;
  text: string;
  stage: MascotStage;
  mascotSrc: string;
}[] = [
  {
    n: '1',
    title: 'Планируй',
    text: 'Поставь тренировки на дни недели — план держит ритм.',
    stage: 1,
    mascotSrc: '/business-card/mascot-plan.png',
  },
  {
    n: '2',
    title: 'Тренируйся',
    text: 'Открой тренировку, отмечай подходы, вес и повторы по ходу.',
    stage: 2,
    mascotSrc: '/business-card/mascot-train.png',
  },
  {
    n: '3',
    title: 'Расти',
    text: 'Смотри, как объём и рекорды идут вверх неделя за неделей.',
    stage: 3,
    mascotSrc: '/business-card/mascot-grow.png',
  },
];

export function SceneSteps({ reducedMotion }: { reducedMotion: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);

  const ref = useScrollFrame((s, el) => {
    if (reducedMotion) return;
    const p = sceneProgress(el, s);
    const track = trackRef.current;
    const panels = panelRefs.current.filter(Boolean) as HTMLDivElement[];
    if (!track || panels.length === 0) return;

    const vw = el.clientWidth;
    // READ phase — offsetLeft/Width don't change with transforms, so these
    // are stable and cause no reflow. centerFor = translateX that centers a panel.
    const centers = panels.map((panel) => vw / 2 - (panel.offsetLeft + panel.offsetWidth / 2));
    const halfW = panels.map((panel) => panel.offsetWidth / 2);

    // pan only while the scene is actually pinned (p in ~[0.33,0.67] for a
    // 200vh scene). Dwell on the first/last panel at each end of the window.
    const eased = clamp((p - 0.4) / 0.2);
    const f = eased * (panels.length - 1); // continuous panel index
    const i0 = Math.min(panels.length - 1, Math.floor(f));
    const i1 = Math.min(panels.length - 1, i0 + 1);
    const frac = f - i0;
    const tx = centers[i0] + (centers[i1] - centers[i0]) * frac;

    // WRITE phase — all DOM writes together, no interleaved reads (no reflow).
    track.style.transform = `translateX(${tx}px)`;

    // per-panel focus: centered panel stays solid, neighbours only gently dim.
    // Panel center on screen = its layout center + the track's tx. Derived
    // analytically instead of getBoundingClientRect() (which forced a sync
    // reflow on every panel, every frame).
    panels.forEach((panel, idx) => {
      const cx = panel.offsetLeft + halfW[idx] + tx;
      const dist = Math.abs(cx - vw / 2) / vw;
      const focus = clamp(1 - dist * 1.15);
      panel.style.opacity = `${0.74 + focus * 0.38}`;
      panel.style.transform = `scale(${0.93 + focus * 0.07})`;
    });
  });

  return (
    <section ref={ref} className={`${styles.scene} ${reducedMotion ? styles.stacked : ''}`}>
      <div className={styles.sticky}>
        <div className={styles.frost} aria-hidden="true" />
        <div className={styles.header}>
          <span className={styles.kicker}>КАК ЭТО РАБОТАЕТ</span>
        </div>
        <div ref={trackRef} className={styles.track}>
          {STEPS.map((step, i) => (
            <div
              key={step.n}
              ref={(el) => { panelRefs.current[i] = el; }}
              className={styles.panel}
            >
              <div className={styles.mascotMount}>
                <MascotShot
                  src={step.mascotSrc}
                  alt={step.title}
                  stage={step.stage}
                />
              </div>
              <span className={styles.bigN}>{step.n}</span>
              <div className={styles.panelBody}>
                <h3 className={styles.panelTitle}>{step.title}</h3>
                <p className={styles.panelText}>{step.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
