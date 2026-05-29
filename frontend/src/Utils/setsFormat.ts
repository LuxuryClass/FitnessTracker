import type { ExerciseSet } from '@/Auth/authApi';

export interface SetsSummary {
  setsCount: number;
  repsMin: number | null;
  repsMax: number | null;
  weightMin: number | null;
  weightMax: number | null;
}

/**
 * Агрегирует сырой список подходов в min/max повторов и веса.
 * Значение `0` трактуется как «не введено» (согласовано с конвертацией payload
 * `reps > 0 ? reps : null` в CreateWorkoutPage), поэтому в диапазоны попадают только значения > 0.
 */
export const aggregateSets = (sets: ExerciseSet[]): SetsSummary => {
  const reps = sets.map(s => s.reps).filter(v => v > 0);
  const weights = sets.map(s => s.weight).filter(v => v > 0);

  return {
    setsCount: sets.length,
    repsMin: reps.length ? Math.min(...reps) : null,
    repsMax: reps.length ? Math.max(...reps) : null,
    weightMin: weights.length ? Math.min(...weights) : null,
    weightMax: weights.length ? Math.max(...weights) : null,
  };
};

const formatNumber = (value: number): string => {
  return Number.isInteger(value) ? String(value) : String(value).replace(/\.0+$/, '');
};

const pluralizeSets = (count: number): string => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'подход';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'подхода';
  return 'подходов';
};

/**
 * Формат вида «4 × 10 • 80кг» / «4 × 8–12 • 60–80кг» / «4 × 10» / «4 подхода».
 * Возвращает `null`, если подходов нет (`setsCount === 0`) — метаданные не показываем вовсе.
 */
export const formatSetsSummary = (summary: SetsSummary): string | null => {
  if (summary.setsCount === 0) return null;

  let main: string;
  if (summary.repsMin !== null && summary.repsMax !== null) {
    const repsText =
      summary.repsMin === summary.repsMax
        ? String(summary.repsMin)
        : `${summary.repsMin}–${summary.repsMax}`;
    main = `${summary.setsCount} × ${repsText}`;
  } else {
    // Без reps показываем «4 подхода» вместо просто «4».
    main = `${summary.setsCount} ${pluralizeSets(summary.setsCount)}`;
  }

  const parts = [main];

  if (summary.weightMin !== null && summary.weightMax !== null) {
    const weightText =
      summary.weightMin === summary.weightMax
        ? `${formatNumber(summary.weightMin)}кг`
        : `${formatNumber(summary.weightMin)}–${formatNumber(summary.weightMax)}кг`;
    parts.push(weightText);
  }

  return parts.join(' • ');
};
