import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';

/**
 * The scroll is the clock. We lerp the raw scrollTop toward a smoothed value
 * (~0.08 catch-up) and broadcast {scroll, smooth, vh, max} to subscribers every
 * frame. Subscribers write transforms straight to the DOM — no React re-render
 * per frame — so parallax glides on a fast flick.
 */

export interface ScrollState {
  scroll: number; // smoothed scrollTop in px
  raw: number; // un-smoothed scrollTop in px
  vh: number; // viewport (scroller) height
  max: number; // max scrollable distance
  progress: number; // global 0..1
  dir: number; // last scroll direction (+1 down / -1 up)
}

type Subscriber = (s: ScrollState) => void;

interface ScrollEngineApi {
  scrollerRef: RefObject<HTMLDivElement>;
  subscribe: (fn: Subscriber) => () => void;
  state: ScrollState;
  reducedMotion: boolean;
}

const ScrollEngineContext = createContext<ScrollEngineApi | null>(null);

const LERP = 0.08;

export function ScrollEngineProvider({
  children,
  reducedMotion,
}: {
  children: ReactNode;
  reducedMotion: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const subsRef = useRef<Set<Subscriber>>(new Set());
  const stateRef = useRef<ScrollState>({
    scroll: 0,
    raw: 0,
    vh: 0,
    max: 0,
    progress: 0,
    dir: 1,
  });
  const rafRef = useRef<number>(0);

  const subscribe = (fn: Subscriber) => {
    subsRef.current.add(fn);
    // push current state immediately so late mounters position correctly
    fn(stateRef.current);
    return () => {
      subsRef.current.delete(fn);
    };
  };

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const measure = () => {
      stateRef.current.vh = el.clientHeight;
      stateRef.current.max = Math.max(1, el.scrollHeight - el.clientHeight);
    };
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);

    let prevSmooth = 0;
    const tick = () => {
      const st = stateRef.current;
      st.raw = el.scrollTop;

      if (reducedMotion) {
        st.scroll = st.raw; // no smoothing; snap to real position
      } else {
        st.scroll += (st.raw - st.scroll) * LERP;
        if (Math.abs(st.raw - st.scroll) < 0.05) st.scroll = st.raw;
      }

      st.dir = st.scroll >= prevSmooth ? 1 : -1;
      prevSmooth = st.scroll;
      st.progress = st.max > 0 ? Math.min(1, Math.max(0, st.scroll / st.max)) : 0;

      const subs = subsRef.current;
      for (const fn of subs) fn(st);

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [reducedMotion]);

  const api: ScrollEngineApi = {
    scrollerRef,
    subscribe,
    state: stateRef.current,
    reducedMotion,
  };

  return (
    <ScrollEngineContext.Provider value={api}>
      {children}
    </ScrollEngineContext.Provider>
  );
}

export function useScrollEngine(): ScrollEngineApi {
  const ctx = useContext(ScrollEngineContext);
  if (!ctx) throw new Error('useScrollEngine must be used inside ScrollEngineProvider');
  return ctx;
}

/**
 * Per-element scroll subscription. The callback runs every frame with the
 * shared scroll state and the element's ref. Write transforms directly.
 */
export function useScrollFrame(
  fn: (state: ScrollState, el: HTMLElement) => void,
  deps: unknown[] = []
): RefObject<HTMLDivElement> {
  const { subscribe } = useScrollEngine();
  const ref = useRef<HTMLDivElement>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return subscribe((s) => fnRef.current(s, el));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}

/**
 * Local scene progress: 0 when the scene top reaches viewport bottom,
 * 1 when the scene bottom reaches viewport top. Clamped.
 */
export function sceneProgress(el: HTMLElement, s: ScrollState): number {
  const rect = el.getBoundingClientRect();
  // rect is relative to the scroller viewport (the scroller fills the shell)
  const start = s.vh; // top at bottom edge
  const end = -rect.height; // bottom at top edge
  const cur = rect.top;
  const p = (start - cur) / (start - end);
  return Math.min(1, Math.max(0, p));
}

/** How far the element's center is from viewport center, in px (signed). */
export function centerOffset(el: HTMLElement, s: ScrollState): number {
  const rect = el.getBoundingClientRect();
  const elCenter = rect.top + rect.height / 2;
  return elCenter - s.vh / 2;
}
