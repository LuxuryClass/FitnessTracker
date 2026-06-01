import { useEffect, useState } from 'react';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return reduced;
}

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Map x from [a,b] -> [c,d], clamped. */
export const mapRange = (
  x: number,
  a: number,
  b: number,
  c: number,
  d: number
) => {
  const t = clamp((x - a) / (b - a));
  return c + (d - c) * t;
};

// House easings from the spec.
export const easeSettle = (t: number) => {
  // approximation of cubic-bezier(0.16, 1, 0.3, 1)
  return 1 - Math.pow(1 - t, 3);
};

export const easeIgnite = (t: number) => {
  // violent middle ~ cubic-bezier(0.85,0,0.15,1)
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
