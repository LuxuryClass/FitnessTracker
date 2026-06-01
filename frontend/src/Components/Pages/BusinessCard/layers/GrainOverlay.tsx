import { useEffect, useRef } from 'react';
import styles from './GrainOverlay.module.scss';

/**
 * Film grain — full-frame monochrome noise, animated by cross-fading 3
 * pre-baked tiles at ~8fps. Static grain reads as a dead JPEG; moving grain
 * looks like air. Disabled under reduced motion (handled by caller).
 */
export function GrainOverlay({ animate }: { animate: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const TILE = 120;

    // Pre-bake 3 noise tiles as patterns.
    const patterns: CanvasPattern[] = [];
    const off = document.createElement('canvas');
    off.width = TILE;
    off.height = TILE;
    const octx = off.getContext('2d')!;
    for (let f = 0; f < 3; f++) {
      const img = octx.createImageData(TILE, TILE);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        img.data[i] = v;
        img.data[i + 1] = v;
        img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      octx.putImageData(img, 0, 0);
      const p = ctx.createPattern(off, 'repeat');
      if (p) patterns.push(p);
    }

    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const paint = (idx: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = patterns[idx];
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    if (!animate) {
      paint(0);
      return () => ro.disconnect();
    }

    let raf = 0;
    let last = 0;
    let idx = 0;
    const loop = (t: number) => {
      if (t - last > 125) {
        // ~8fps
        last = t;
        idx = (idx + 1) % patterns.length;
        paint(idx);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [animate]);

  return <canvas ref={canvasRef} className={styles.grain} aria-hidden="true" />;
}
