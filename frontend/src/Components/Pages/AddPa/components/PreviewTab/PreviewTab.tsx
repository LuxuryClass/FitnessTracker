import { useEffect, useMemo, useState } from 'react';
import MuscleAccentComponent from '@/Components/Common/MuscleAccentComponent/MuscleAccentComponent';
import styles from './Styles.module.scss';
import { DefaultExerciseRow } from '../../../../Common/DefaultExerciseRow/DefaultExerciseRow';
import { PreviewCard } from '@/Components/Common/PreviewCard/PreviewCard';
import type { Exercise, ExerciseSet } from '@/Auth/authApi';
import { labelForPrimary, labelsForPrimaryList, labelsForSecondaryList } from '@/Utils/muscleGroups';

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

  // Суммарный тоннаж (тонны): сумма вес × повторы по всем подходам, делённая на 1000.
  // Одна цифра после запятой, хвост «.0» убирается.
  const totalWeight = useMemo(() => {
    const kg = items.reduce((acc, ex) => {
      const sets = setsByExerciseId[ex.id] ?? [];
      return acc + sets.reduce((s, set) => s + set.weight * set.reps, 0);
    }, 0);
    const tons = (kg / 1000).toFixed(1);
    return tons.endsWith('.0') ? tons.slice(0, -2) : tons;
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
            return (
              <DefaultExerciseRow
                key={exercise.id}
                name={exercise.name}
                muscleGroups={labelsForPrimaryList(exercise.primary_muscle_groups)}
                targetMuscles={labelsForSecondaryList(exercise.secondary_muscles)}
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