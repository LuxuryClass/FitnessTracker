import styles from './Wordmark.module.scss';
import cn from 'classnames';

/**
 * Lowercase `flame`. The `a`'s inner counter is filled with Lime Core — a coal
 * lodged in the letter. The lime fill can lag the white letters (the coal
 * catching) via the `lit` flag.
 */
export function Wordmark({
  size = 64,
  lit = true,
  className,
}: {
  size?: number;
  lit?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(styles.wordmark, className)}
      style={{ fontSize: `${size}px` }}
      aria-label="FlameFitness"
    >
      <span aria-hidden="true">Fl</span>
      <span className={cn(styles.a, lit && styles.aLit)} aria-hidden="true">
        a
      </span>
      <span aria-hidden="true">me</span>
      <br aria-hidden="true" />
      <span aria-hidden="true">Fit</span>
      <span className={cn(styles.a, lit && styles.aLit)} aria-hidden="true">
        n
      </span>
      <span aria-hidden="true">ess</span>
    </span>
  );
}
