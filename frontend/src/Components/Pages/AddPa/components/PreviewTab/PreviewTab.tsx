import { useEffect, useMemo, useState } from 'react';
import MuscleAccentComponent from '@/Components/Common/MuscleAccentComponent/MuscleAccentComponent';
import styles from './Styles.module.scss';
import { ExerciseRow } from '../../../../Common/ExerciseRow/ExerciseRow';
import { PreviewCard } from '@/Components/Common/PreviewCard/PreviewCard';
import type { Exercise, ExerciseSet } from '@/Auth/authApi';
import { labelForPrimary, labelForSecondary } from '@/Utils/muscleGroups';

// Минут на один подход — синхронизировано с backend (MINUTES_PER_SET в workout_service.py).
const MINUTES_PER_SET = 5;

interface PreviewTabProps {
  workoutName: string;
  exercises: Exercise[];
  setsByExerciseId: Record<string, ExerciseSet[]>;
  date?: string;
  time?: string;
  onReorder?: (exercises: Exercise[]) => void;
}

export const PreviewTab = ({
  workoutName,
  exercises,
  setsByExerciseId,
  date,
  time,
  onReorder,
}: PreviewTabProps) => {
  const [items, setItems] = useState<Exercise[]>(exercises);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  // Синхронизируем локальный список с пропсами, когда родитель прокинул другой набор.
  useEffect(() => {
    setItems(exercises);
  }, [exercises]);

  // Уникальные primary-группы из выбранных упражнений (для шапки превью).
  const muscleGroups = useMemo(() => {
    const set = new Set<string>();
    for (const ex of items) {
      for (const g of ex.primary_muscle_groups) set.add(g);
    }
    return Array.from(set).map(labelForPrimary);
  }, [items]);

  const exercisesCount = items.length;

  // Оценка длительности как на бэкенде: сумма подходов × 5 минут (MINUTES_PER_SET).
  const duration = useMemo(() => {
    const totalSets = items.reduce(
      (acc, ex) => acc + (setsByExerciseId[ex.id]?.length ?? 0),
      0,
    );
    return `${totalSets * MINUTES_PER_SET}`;
  }, [items, setsByExerciseId]);

  // Суммарный тоннаж: вес × повторы по всем подходам всех упражнений.
  const totalWeight = useMemo(() => {
    const sum = items.reduce((acc, ex) => {
      const sets = setsByExerciseId[ex.id] ?? [];
      return acc + sets.reduce((s, set) => s + set.weight * set.reps, 0);
    }, 0);
    return `${sum}`;
  }, [items, setsByExerciseId]);

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setOverIndex(index);
  };

  const handleDragEnd = () => {
    if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
      const newItems = [...items];
      const [removed] = newItems.splice(dragIndex, 1);
      newItems.splice(overIndex, 0, removed);
      setItems(newItems);
      onReorder?.(newItems);
    }
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <div className={styles.tab}>
      <PreviewCard
        title={workoutName || 'Новая тренировка'}
        duration={duration}
        totalWeight={totalWeight}
        exercisesCount={exercisesCount}
        date={date}
        time={time}
        muscleGroups={muscleGroups}
      />

      <div className={styles.exercisesSection}>
        <div className={styles.exercisesList}>
          {items.map((exercise, index) => {
            const muscleLabel =
              labelForSecondary(exercise.secondary_muscles[0] ?? '')
              || labelForPrimary(exercise.primary_muscle_groups[0] ?? '');
            return (
              <ExerciseRow
                key={exercise.id}
                name={exercise.name}
                muscleGroup={muscleLabel}
                sets={setsByExerciseId[exercise.id] ?? []}
                index={index}
                isDragging={dragIndex === index}
                isOver={overIndex === index}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
              />
            );
          })}
        </div>
      </div>

      <div className={styles.accentSection}>
        {/* <h3 className={styles.sectionTitle}>Акцент на мышцы</h3> */}
        <MuscleAccentComponent />
      </div>
    </div>
  );
};