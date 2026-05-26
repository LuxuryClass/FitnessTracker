import { Button } from "@/Components/UI/Button/Button";
import styles from "./Styles.module.scss";
import cn from "classnames";
import startImage from '/start-button.svg';

export interface TodayWorkoutExercise {
  name: string;
  muscleGroup: string;
  setsCount: number | null;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetWeightKgMin: number | null;
  targetWeightKgMax: number | null;
}

interface TodayWorkoutProps {
  title?: string;
  plannedFor?: Date | string;
  durationMinutes?: number | null;
  exercisesCount?: number;
  muscleGroups?: string[];
  exercises?: TodayWorkoutExercise[];
  onStart?: () => void;
  isEmpty?: boolean;
  className?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfLocalDay = (d: Date): Date => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

// Возвращает заголовок карточки в зависимости от расстояния до даты тренировки.
const formatHeaderTitle = (plannedFor: Date | string | undefined): string => {
  if (!plannedFor) return "Тренировка на сегодня";
  const planned = typeof plannedFor === "string" ? new Date(plannedFor) : plannedFor;
  if (Number.isNaN(planned.getTime())) return "Тренировка на сегодня";

  const today = startOfLocalDay(new Date());
  const plannedDay = startOfLocalDay(planned);
  const diffDays = Math.round((plannedDay.getTime() - today.getTime()) / DAY_MS);

  if (diffDays === 0) return "Тренировка на сегодня";
  if (diffDays === 1) return "Тренировка на завтра";
  const dd = String(plannedDay.getDate()).padStart(2, "0");
  const mm = String(plannedDay.getMonth() + 1).padStart(2, "0");
  return `Тренировка на ${dd}.${mm}`;
};

const formatNumber = (value: number): string => {
  return Number.isInteger(value) ? String(value) : String(value).replace(/\.0+$/, "");
};

// Формат вида «4 × 10 • 80кг» / «4 × 8–12 • 60–80кг» / «4 × 10» / «4 подхода».
// Если `setsCount` отсутствует — возвращает null (метаданные не показываем вовсе).
const formatSetsLabel = (exercise: TodayWorkoutExercise): string | null => {
  if (exercise.setsCount === null) return null;

  const parts: string[] = [];
  parts.push(String(exercise.setsCount));

  if (exercise.targetRepsMin !== null && exercise.targetRepsMax !== null) {
    const repsText =
      exercise.targetRepsMin === exercise.targetRepsMax
        ? String(exercise.targetRepsMin)
        : `${exercise.targetRepsMin}–${exercise.targetRepsMax}`;
    parts[0] = `${parts[0]} × ${repsText}`;
  } else {
    // Без reps показываем «4 подхода» вместо просто «4».
    parts[0] = `${exercise.setsCount} ${pluralizeSets(exercise.setsCount)}`;
  }

  if (exercise.targetWeightKgMin !== null && exercise.targetWeightKgMax !== null) {
    const weightText =
      exercise.targetWeightKgMin === exercise.targetWeightKgMax
        ? `${formatNumber(exercise.targetWeightKgMin)}кг`
        : `${formatNumber(exercise.targetWeightKgMin)}–${formatNumber(exercise.targetWeightKgMax)}кг`;
    parts.push(weightText);
  }

  return parts.join(" • ");
};

const pluralizeSets = (count: number): string => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "подход";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "подхода";
  return "подходов";
};

export const TodayWorkout = ({
  title,
  plannedFor,
  durationMinutes,
  exercisesCount,
  muscleGroups,
  exercises,
  onStart,
  isEmpty = false,
  className,
}: TodayWorkoutProps) => {
  const headerTitle = formatHeaderTitle(plannedFor);

  if (isEmpty || !title || !exercises || exercises.length === 0) {
    return (
      <div className={cn(className, styles.card, styles.card__empty)}>
        <h2 className={styles.title}>{headerTitle}</h2>
        <p className={styles.emptyText}>Тренировок нет</p>
      </div>
    );
  }

  const visibleExercises = exercises.slice(0, 3);
  const remainingCount = exercises.length - visibleExercises.length;

  return (
    <div className={cn(className, styles.card, styles.card__notEmpty)}>
      <div className={styles.header}>
        <h2 className={styles.header__title}>{headerTitle}</h2>
        <h3 className={styles.header__workoutName}>{title}</h3>

        <div className={styles.meta}>
            <div className={styles.meta__item_1_2}>
                {durationMinutes != null && (
                  <span className={styles.meta__duration}>~ {durationMinutes} мин</span>
                )}
                <span className={styles.meta__Count}>{exercisesCount ?? exercises.length} упр</span>
            </div>
            {muscleGroups && muscleGroups.length > 0 && (
              <span className={styles.meta__muscleGroups}>{muscleGroups.join(" • ")}</span>
            )}
        </div>
      </div>

      <div className={styles.exercises}>
        {visibleExercises.map((exercise, index) => {
          const setsLabel = formatSetsLabel(exercise);
          return (
            <div key={index} className={styles.exercise}>
              <div className={styles.exerciseInfo}>
                <span className={styles.exerciseName}>{exercise.name}</span>
                <span className={styles.exerciseDetails}>
                  {setsLabel ? `${setsLabel} [${exercise.muscleGroup}]` : `[${exercise.muscleGroup}]`}
                </span>
              </div>
            </div>
          );
        })}

        {remainingCount > 0 && (
          <p className={styles.moreExercises}>
            + ещё {remainingCount} упражнения
          </p>
        )}
      </div>

      <Button
        size="l"
        color="primary"
        fullWidth
        className={styles.start_button}
        onClick={onStart}
      >
        <span className={styles.start_button__text}>Перейти</span>
        <img src={startImage} />
      </Button>
    </div>
  );
};
