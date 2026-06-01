import { useState } from 'react';
import styles from './MascotShot.module.scss';

export type MascotStage = 1 | 2 | 3;

/**
 * Mascot figurine that stands ON TOP of a step card. It shows the maskot at a
 * given transformation stage (picture -> качок). Until the real 3D render exists
 * at `src`, a stage-specific silhouette placeholder is drawn. Drop a PNG (ideally
 * with transparent background) at the `src` path under /public and it appears
 * automatically — no code change needed.
 */
export function MascotShot({
  src,
  alt,
  stage,
}: {
  src: string;
  alt: string;
  stage: MascotStage;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={styles.mascot} data-stage={stage}>
      <div className={styles.halo} aria-hidden="true" />
      <div className={styles.figure}>
        {!failed ? (
          <img
            src={src}
            alt={alt}
            className={styles.img}
            loading="lazy"
            onError={() => setFailed(true)}
          />
        ) : (
          <Placeholder stage={stage} alt={alt} />
        )}
      </div>
      <div className={styles.shadow} aria-hidden="true" />
    </div>
  );
}

function Placeholder({ stage, alt }: { stage: MascotStage; alt: string }) {
  return (
    <div className={styles.placeholder}>
      <svg
        viewBox="0 0 120 150"
        className={styles.silhouette}
        role="img"
        aria-label={`${alt} — заглушка`}
      >
        <defs>
          <linearGradient id={`mascotGrad${stage}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c9f84a" />
            <stop offset="100%" stopColor="#5b7d0b" />
          </linearGradient>
        </defs>
        <g fill={`url(#mascotGrad${stage})`}>
          {stage === 1 && <StageSeed />}
          {stage === 2 && <StageTrain />}
          {stage === 3 && <StageBeast />}
        </g>
      </svg>
      <span className={styles.tag}>заглушка маскота</span>
    </div>
  );
}

/* Stage 1 — «Планируй»: slim mascot holding a planning board. */
function StageSeed() {
  return (
    <>
      <circle cx="60" cy="30" r="15" />
      <rect x="50" y="46" width="20" height="46" rx="9" />
      {/* thin arms */}
      <rect x="38" y="52" width="9" height="34" rx="4.5" transform="rotate(8 42 69)" />
      <rect x="73" y="52" width="9" height="34" rx="4.5" transform="rotate(-8 78 69)" />
      {/* legs */}
      <rect x="51" y="90" width="8" height="40" rx="4" />
      <rect x="61" y="90" width="8" height="40" rx="4" />
      {/* planning board held in front */}
      <rect x="44" y="70" width="32" height="40" rx="4" opacity="0.55" />
      <rect x="49" y="78" width="22" height="3.4" rx="1.7" fill="#0b0d07" />
      <rect x="49" y="86" width="22" height="3.4" rx="1.7" fill="#0b0d07" />
      <rect x="49" y="94" width="14" height="3.4" rx="1.7" fill="#0b0d07" />
    </>
  );
}

/* Stage 2 — «Тренируйся»: mid build, curling a dumbbell. */
function StageTrain() {
  return (
    <>
      <circle cx="60" cy="28" r="15" />
      {/* wider torso */}
      <path d="M44 46 H76 a8 8 0 0 1 8 8 v26 a10 10 0 0 1 -10 10 H46 a10 10 0 0 1 -10 -10 V54 a8 8 0 0 1 8 -8 Z" />
      {/* curling arm up */}
      <rect x="74" y="40" width="11" height="26" rx="5.5" transform="rotate(28 79 53)" />
      <rect x="34" y="56" width="11" height="30" rx="5.5" transform="rotate(-10 39 71)" />
      {/* legs */}
      <rect x="49" y="92" width="10" height="40" rx="5" />
      <rect x="61" y="92" width="10" height="40" rx="5" />
      {/* dumbbell */}
      <rect x="84" y="30" width="7" height="20" rx="3.5" />
      <rect x="80" y="36" width="15" height="6" rx="3" />
    </>
  );
}

/* Stage 3 — «Расти»: full beast mode, flexing. */
function StageBeast() {
  return (
    <>
      <circle cx="60" cy="26" r="15" />
      {/* massive trapezius + chest */}
      <path d="M38 44 Q60 34 82 44 L86 62 a12 12 0 0 1 -8 12 H42 a12 12 0 0 1 -8 -12 Z" />
      {/* both arms flexed up */}
      <path d="M34 50 q-12 6 -10 22 q1 10 12 9 q9 -1 8 -12 l-2 -16 Z" />
      <path d="M86 50 q12 6 10 22 q-1 10 -12 9 q-9 -1 -8 -12 l2 -16 Z" />
      {/* big forearms / fists */}
      <circle cx="27" cy="46" r="8" />
      <circle cx="93" cy="46" r="8" />
      {/* torso taper to waist */}
      <path d="M42 72 H78 l-5 26 a16 16 0 0 1 -26 0 Z" />
      {/* thick legs */}
      <rect x="47" y="96" width="12" height="40" rx="6" />
      <rect x="61" y="96" width="12" height="40" rx="6" />
    </>
  );
}
