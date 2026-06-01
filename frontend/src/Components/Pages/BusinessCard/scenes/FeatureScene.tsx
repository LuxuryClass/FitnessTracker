import { useRef } from 'react';
import { sceneProgress, useScrollFrame } from '../engine/ScrollEngine';
import { mapRange, clamp } from '../engine/hooks';
import { PhoneShot } from './PhoneShot';
import styles from './FeatureScene.module.scss';

export interface FeatureSceneProps {
  index: string; // "01"
  kicker: string;
  title: string;
  points: string[];
  shotSrc: string;
  shotAlt: string;
  flip?: boolean; // phone on the left, text on the right
  reducedMotion: boolean;
  noSnap?: boolean; // drop center-snap (used on the last feature before the short outro)
}

export function FeatureScene({
  index,
  kicker,
  title,
  points,
  shotSrc,
  shotAlt,
  flip = false,
  reducedMotion,
  noSnap = false,
}: FeatureSceneProps) {
  const deviceRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  const ref = useScrollFrame((s, el) => {
    if (reducedMotion) return;
    const p = sceneProgress(el, s);
    const drift = (p - 0.5) * s.vh;
    const dir = flip ? -1 : 1;

    // device 3D tilt eases as it rises; faces you near center
    const yTilt = mapRange(p, 0, 1, -12, -2) * dir;
    if (deviceRef.current) {
      deviceRef.current.style.transform = `translateY(${-drift * 0.4}px) perspective(1000px) rotateY(${yTilt}deg) rotateZ(${2 * dir}deg)`;
    }
    if (shadowRef.current) {
      shadowRef.current.style.transform = `translateY(${-drift * 0.46}px) translateX(-50%) rotateZ(${2 * dir}deg)`;
    }
    // screenshot inside scrolls slightly (it has real depth)
    if (innerRef.current) {
      innerRef.current.style.transform = `translateY(${mapRange(p, 0, 1, 10, -10)}px)`;
    }
    // text plane moves faster than device
    if (textRef.current) {
      textRef.current.style.transform = `translateY(${-drift * 0.12}px)`;
    }
    // soft glow behind the device drifts slowest (deep plane) + slow spin
    if (glowRef.current) {
      const spin = (s.scroll / 8) % 360;
      glowRef.current.style.transform = `translate(-50%, calc(-50% + ${-drift * 0.04}px)) rotate(${spin}deg)`;
    }
    const op = clamp(mapRange(p, 0.06, 0.24, 0, 1) * mapRange(p, 0.94, 0.74, 0, 1));
    el.style.setProperty('--op', `${op}`);
    // reveal progress for staged entrance (0 below fold -> 1 at center)
    el.style.setProperty('--reveal', `${clamp(mapRange(p, 0.18, 0.46, 0, 1))}`);
  });

  return (
    <section
      ref={ref}
      className={`${styles.scene} ${flip ? styles.flip : ''} ${noSnap ? styles.noSnap : ''}`}
    >
      <span className={styles.watermark} aria-hidden="true">{index}</span>

      <div ref={textRef} className={styles.text}>
        <span className={styles.kicker}>
          <em>{index}</em> {kicker}
        </span>
        <h2 className={styles.title}>{title}</h2>
        <ul className={styles.points}>
          {points.map((pt) => (
            <li key={pt} className={styles.point}>
              <span className={styles.dot} />
              {pt}
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.stage}>
        <div ref={shadowRef} className={styles.shadow} aria-hidden="true" />
        <div ref={glowRef} className={styles.glow} aria-hidden="true" />
        <div ref={deviceRef} className={styles.device}>
          <PhoneShot src={shotSrc} alt={shotAlt} innerRef={innerRef} />
        </div>
      </div>
    </section>
  );
}
