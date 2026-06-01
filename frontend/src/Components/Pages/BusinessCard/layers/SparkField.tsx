import { useEffect, useRef } from 'react';
import styles from './SparkField.module.scss';

/**
 * Sparks peel off the ribbon and drift on lazy bézier arcs (1-3 passively).
 * A struck match, not an explosion.
 */

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
}

export function SparkField({
  ribbonXAt,
  enabled,
}: {
  ribbonXAt: () => number;
  enabled: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparksRef = useRef<Spark[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    let last = performance.now();
    let spawnAcc = 0;

    const loop = (t: number) => {
      const dt = Math.min(48, t - last);
      last = t;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Passive spawn from the ribbon (irregular cadence).
      if (enabled) {
        spawnAcc += dt;
        const interval = 1400 + Math.random() * 1800;
        if (spawnAcc > interval && sparksRef.current.length < 5) {
          spawnAcc = 0;
          const rx = ribbonXAt();
          const ry = canvas.height * (0.35 + Math.random() * 0.4);
          sparksRef.current.push({
            x: rx,
            y: ry,
            vx: 0.2 + Math.random() * 0.5,
            vy: -(0.2 + Math.random() * 0.4),
            life: 0,
            max: 8000 + Math.random() * 6000,
            size: 1 + Math.random() * 1.4,
          });
        }
      }

      // Sparks — passive drift + waver.
      const sparks = sparksRef.current;
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life += dt;
        const p = s.life / s.max;
        if (p >= 1) {
          sparks.splice(i, 1);
          continue;
        }
        s.x += s.vx * (dt / 16);
        s.y += s.vy * (dt / 16);
        s.x += Math.sin(s.life / 600) * 0.3;
        s.vy -= 0.002 * (dt / 16); // gentle rise
        const alpha = (1 - p) * 0.6;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(159,218,22,${alpha})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(159,218,22,0.8)';
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [enabled, ribbonXAt]);

  return <canvas ref={canvasRef} className={styles.sparks} aria-hidden="true" />;
}
