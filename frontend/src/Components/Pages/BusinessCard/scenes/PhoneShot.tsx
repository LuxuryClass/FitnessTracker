import { useState } from 'react';
import styles from './PhoneShot.module.scss';

/**
 * A phone bezel that holds a REAL app screenshot (vertical). Until the image
 * file exists, a labelled placeholder is shown. Drop a PNG at the given `src`
 * path (under /public) and it appears automatically — no code change needed.
 */
export function PhoneShot({
  src,
  alt,
  innerRef,
}: {
  src: string;
  alt: string;
  innerRef?: React.RefObject<HTMLDivElement>;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={styles.frame}>
      <div className={styles.notch} />
      <div className={styles.screen}>
        <div ref={innerRef} className={styles.inner}>
          {!failed ? (
            <img
              src={src}
              alt={alt}
              className={styles.shot}
              loading="lazy"
              onError={() => setFailed(true)}
            />
          ) : (
            <div className={styles.placeholder}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="3" stroke="#9FDA16" strokeWidth="1.4" />
                <path d="M3 16l4-4 4 4 3-3 4 4" stroke="#9FDA16" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="9" cy="9" r="1.6" fill="#9FDA16" />
              </svg>
              <span className={styles.phName}>{alt}</span>
              <span className={styles.phHint}>скриншот сюда</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
