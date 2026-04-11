import ArrowBack from './ArrowBack.svg';
import Eye from './Eye.svg';


export const icons = {
  arrowBack: ArrowBack,
  eye: Eye,
  lock: Lock,
} as const;

export type Glyph = keyof typeof icons;
