import type { Exercise } from '@/Auth/authApi';

export const PRIMARY_MUSCLE_GROUPS = [
  'chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio',
] as const;

export type PrimaryMuscleGroup = typeof PRIMARY_MUSCLE_GROUPS[number];

// Какие secondary доступны для выбора, когда выбрана данная primary.
export const PRIMARY_TO_SECONDARY: Record<string, string[]> = {
  chest: ['chest'],
  back: ['upper-back', 'lower-back', 'trapezius'],
  legs: ['quadriceps', 'hamstring', 'gluteal', 'calves', 'adductors', 'abductors', 'tibialis'],
  shoulders: ['deltoids', 'trapezius'],
  arms: ['biceps', 'triceps', 'forearm'],
  core: ['abs', 'obliques'],
  cardio: [],
};

export const PRIMARY_LABELS: Record<string, string> = {
  chest: 'Грудь',
  back: 'Спина',
  legs: 'Ноги',
  shoulders: 'Плечи',
  arms: 'Руки',
  core: 'Корпус',
  cardio: 'Кардио',
};

export const SECONDARY_LABELS: Record<string, string> = {
  chest: 'Грудь',
  'upper-back': 'Спина',
  'lower-back': 'Поясница',
  trapezius: 'Трапеция',
  abs: 'Пресс',
  obliques: 'Косые',
  biceps: 'Бицепс',
  triceps: 'Трицепс',
  forearm: 'Предплечья',
  deltoids: 'Плечи',
  quadriceps: 'Квадрицепс',
  hamstring: 'Бицепс бедра',
  gluteal: 'Ягодицы',
  calves: 'Икры',
  adductors: 'Приводящие',
  abductors: 'Отводящие',
  neck: 'Шея',
  tibialis: 'Голень',
};

export const labelForPrimary = (key: string): string => PRIMARY_LABELS[key] ?? key;
export const labelForSecondary = (key: string): string => SECONDARY_LABELS[key] ?? key;

export const filterExercisesByCategory = (
  exercises: Exercise[],
  categoryId: string,
  currentUserId: string | null,
): Exercise[] => {
  if (categoryId === 'myself') {
    return exercises.filter(e => e.created_by_user_id === currentUserId);
  }
  return exercises.filter(e => e.primary_muscle_groups.includes(categoryId));
};
