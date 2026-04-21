import { Button } from "@/Components/UI/Button/Button";
import styles from "./Styles.module.scss";
import cn from "classnames";

interface Exercise {
  name: string;
  sets: number;
  reps: number;
  muscleGroup: string;
}

interface TodayWorkoutProps {
  title?: string;
  duration?: string;
  exercisesCount?: number;
  muscleGroups?: string[];
  exercises?: Exercise[];
  onStart?: () => void;
  isEmpty?: boolean;
  className?: string;
}

export const TodayWorkout = ({
  title = "День жимов",
  duration = "75 мин",
  exercisesCount = 6,
  muscleGroups = ["Грудь", "Плечи"],
  exercises = [
    { name: "Жим лежа", sets: 4, reps: 10, muscleGroup: "Грудь" },
    { name: "Жим гантелей", sets: 3, reps: 12, muscleGroup: "Грудь" },
    { name: "Жим гантелей", sets: 3, reps: 12, muscleGroup: "Грудь" },
    { name: "Жим гантелей", sets: 3, reps: 12, muscleGroup: "Грудь" },
    { name: "Жим гантелей", sets: 3, reps: 12, muscleGroup: "Грудь" },
    { name: "Жим гантелей", sets: 3, reps: 12, muscleGroup: "Грудь" },
  ],
  onStart,
  isEmpty = false,
  className,
}: TodayWorkoutProps) => {
  if (isEmpty) {
    return (
      <div className={cn(className, styles.card, styles.card__empty)}>
        <h2 className={styles.title}>Тренировка на сегодня</h2>
        <p className={styles.emptyText}>Тренировок нет</p>
      </div>
    );
  }

  const visibleExercises = exercises.slice(0, 3);
  const remainingCount = exercises.length - visibleExercises.length;

  return (
    <div className={cn(className, styles.card, styles.card__notEmpty)}>
      <div className={styles.header}>
        <h2 className={styles.header__title}>Тренировка на сегодня</h2>
        <h3 className={styles.header__workoutName}>{title}</h3>

        <div className={styles.meta}>
            <div className={styles.meta__item_1_2}>
                <span className={styles.meta__duration}>~ {duration}</span>
                <span className={styles.meta__Count}>{exercisesCount} упр</span>
            </div>
            <span className={styles.meta__muscleGroups}>{muscleGroups.join(" • ")}</span>
        </div>
      </div>

      <div className={styles.exercises}>
        {visibleExercises.map((exercise, index) => (
          <div key={index} className={styles.exercise}>
            <div className={styles.exerciseInfo}>
              <span className={styles.exerciseName}>{exercise.name}</span>
              <span className={styles.exerciseDetails}>
                {exercise.sets} x {exercise.reps} [{exercise.muscleGroup}]
              </span>
            </div>
          </div>
        ))}

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
        <img src="/Public/start-button.svg" />
      </Button>
    </div>
  );
};
9