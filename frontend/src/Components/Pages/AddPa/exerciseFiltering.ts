import type { Exercise } from '@/Auth/authApi';

/**
 * Фильтрация упражнений по выбранной фронт-вкладке на странице создания тренировки.
 * `myself` — упражнения, созданные текущим пользователем.
 * Прочие category-id — совпадение по `primary_muscle_groups`.
 */
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
