import { useEffect, useMemo, useState } from 'react';
import MuscleAccentComponent from '@/Components/Common/MuscleAccentComponent/MuscleAccentComponent';
import styles from './Styles.module.scss';
import { ExerciseRow } from '../../../../Common/ExerciseRow/ExerciseRow';
import { PreviewCard } from '@/Components/Common/PreviewCard/PreviewCard';
import type { Exercise } from '@/Auth/authApi';
import { labelForPrimary, labelForSecondary } from '../../muscleGroupMapping';

interface PreviewTabProps {
  workoutName: string;
  exercises: Exercise[];
  date?: string;
  time?: string;
  onReorder?: (exercises: Exercise[]) => void;
}

export const PreviewTab = ({
  workoutName,
  exercises,
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

  // 5 минут на упражнение — грубая оценка до появления реальных подходов.
  const duration = useMemo(() => `${items.length * 5}`, [items]);

  // Реальной информации о весах нет, пока target_sets = null. Показываем 0.
  const totalWeight = '0';

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
                // TODO: визуальный плейсхолдер; реальные подходы появятся, когда будет UI ввода подходов.
                sets={[
                  { weight: 60, reps: 10 },
                  { weight: 80, reps: 8 },
                  { weight: 100, reps: 5 },
                ]}
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