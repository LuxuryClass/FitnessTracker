/**
 * Канонический список primary-групп мышц (whitelist на бэке).
 * Используется как ID UI-вкладок выбора упражнения и как ключи для лейблов/фильтров.
 */
export const PRIMARY_MUSCLE_GROUPS = [
  'chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio',
] as const;

export type PrimaryMuscleGroup = typeof PRIMARY_MUSCLE_GROUPS[number];

/**
 * Какие secondary-мышцы доступны для выбора, когда выбрана данная primary-группа.
 * UX-правило для UI создания упражнения. Если выбрано несколько primary —
 * списки объединяются.
 */
export const PRIMARY_TO_SECONDARY: Record<string, string[]> = {
  chest: ['chest'],
  back: ['upper-back', 'lower-back', 'trapezius'],
  legs: ['quadriceps', 'hamstring', 'gluteal', 'calves', 'adductors', 'abductors', 'tibialis'],
  shoulders: ['deltoids'],
  arms: ['biceps', 'triceps', 'forearm'],
  core: ['abs', 'obliques'],
  cardio: [],
};

/**
 * Лейблы для отображения primary-групп мышц пользователю на русском.
 * Источник истины — этот словарь, используется во всех точках UI,
 * где английские ключи приходят из API и должны быть переведены.
 */
export const PRIMARY_LABELS: Record<string, string> = {
  chest: 'Грудь',
  back: 'Спина',
  legs: 'Ноги',
  shoulders: 'Плечи',
  arms: 'Руки',
  core: 'Корпус',
  cardio: 'Кардио',
};

/**
 * Лейблы для secondary-мышц (детальный уровень — для карточек упражнений и т.п.).
 */
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

/**
 * Перевод массива primary-ключей в массив человекочитаемых лейблов.
 * Удобно для пропсов компонентов, ожидающих `string[]` (PreviewCard, WorkoutCard, ...).
 */
export const labelsForPrimaryList = (keys: string[]): string[] => keys.map(labelForPrimary);

/**
 * Перевод массива secondary-ключей в человекочитаемые лейблы.
 */
export const labelsForSecondaryList = (keys: string[]): string[] => keys.map(labelForSecondary);
