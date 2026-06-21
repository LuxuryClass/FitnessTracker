import { useEffect, useRef, useState } from 'react';
import { useScrollEngine } from '../engine/ScrollEngine';
import { clamp } from '../engine/hooks';
import styles from './LightRibbon.module.scss';

/**
 * The Light Ribbon — the spine of the whole scroll.
 * A continuous meandering vertical ribbon, 6% left of center, drawn by scroll.
 * Its visible length is tied to global scroll, always ending a little below
 * the current viewport center, so you feel you are pulling the light down.
 */

const AMP = 13; // sine amplitude px
const WAVELEN_VH = 1.2; // wavelength in viewports

function buildPath(w: number, h: number, vh: number): string {
  if (vh <= 0 || h <= 0) return '';
  const centerX = w * 0.5;
  const baseX = centerX - w * 0.06; // 6% left of center
  const wavelength = vh * WAVELEN_VH;
  const step = 8;
  let d = '';
  for (let y = 0; y <= h; y += step) {
    const x = baseX + Math.sin((y / wavelength) * Math.PI * 2) * AMP;
    d += d === '' ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return d;
}

/** Sample the ribbon x at a given absolute content y — used to anchor sparks. */
export function ribbonX(w: number, y: number, vh: number): number {
  const baseX = w * 0.5 - w * 0.06;
  const wavelength = vh * WAVELEN_VH;
  return baseX + Math.sin((y / wavelength) * Math.PI * 2) * AMP;
}

export function LightRibbon({ reducedMotion }: { reducedMotion: boolean }) {
  const { scrollerRef, subscribe } = useScrollEngine();
  const [dims, setDims] = useState({ w: 0, h: 0, vh: 0 });
  const pathRef = useRef<SVGPathElement | null>(null);
  const groupRef = useRef<SVGGElement | null>(null);
  const shimmerRef = useRef<SVGCircleElement | null>(null);
  const lenRef = useRef(0);

  // Measure the scroller and rebuild the path on resize.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const measure = () =>
      setDims({ w: el.clientWidth, h: el.scrollHeight, vh: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [scrollerRef]);

  // Cache total path length whenever the path changes.
  useEffect(() => {
    const p = pathRef.current;
    if (!p) return;
    lenRef.current = p.getTotalLength();
    p.style.strokeDasharray = `${lenRef.current}`;
  }, [dims]);

  // Drive the draw + shimmer each frame.
  useEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    return subscribe((s) => {
      const len = lenRef.current;
      if (!len) return;
      const visibleY = s.scroll + s.vh * 0.55;
      const drawn = reducedMotion ? len : clamp(visibleY / dims.h) * len;
      g.style.strokeDashoffset = `${len - drawn}`;

      // Shimmer pulse travels down the drawn region (time-based).
      const sh = shimmerRef.current;
      if (sh && !reducedMotion) {
        const t = (performance.now() % 6000) / 6000;
        const pos = clamp(t) * drawn;
        // The ribbon is a near-vertical sine (max slope ~0.09), so arc-length
        // ≈ y. Compute the point analytically instead of getPointAtLength(),
        // which forces a per-frame SVG geometry recalc.
        const cy = Math.min(pos, dims.h - 0.5);
        const cx = ribbonX(dims.w, cy, dims.vh);
        sh.setAttribute('cx', `${cx}`);
        sh.setAttribute('cy', `${cy}`);
      }
    });
  }, [subscribe, dims, reducedMotion]);

  const d = buildPath(dims.w, dims.h, dims.vh);

  useEffect(() => {
    const p = pathRef.current;
    const g = groupRef.current;
    if (!p || !g) return;
    lenRef.current = p.getTotalLength();
    g.style.strokeDasharray = `${lenRef.current}`;
  }, [dims]);

  return (
    <svg
      className={styles.ribbon}
      width={dims.w}
      height={dims.h}
      viewBox={`0 0 ${dims.w} ${dims.h}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ribbonFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9FDA16" />
          <stop offset="50%" stopColor="#9FDA16" />
          <stop offset="100%" stopColor="#5B7D0B" />
        </linearGradient>
        {/* Tight filter region: a 3.5px blur needs only a few px of padding,
            not 2x the full content height. objectBoundingBox % over a
            full-height path made the old height=200% buffer enormous. */}
        <filter id="ribbonGlow" x="-100%" y="-0.5%" width="300%" height="101%">
          <feGaussianBlur stdDeviation="3.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g ref={groupRef} className={styles.ribbonGlowGroup}>
          <path d={d} ref={pathRef} className={styles.ribbonHalo} stroke="url(#ribbonFill)" />
          <path d={d} className={styles.ribbonGlowPath} stroke="url(#ribbonFill)" />
          <path d={d} className={styles.ribbonDrawPath} stroke="url(#ribbonFill)" />
      </g>

      {/* shimmer pulse */}
      {!reducedMotion && (
        <circle ref={shimmerRef} r="5" className={styles.shimmer} cx="-100" cy="-100" />
      )}
    </svg>
  );
}
