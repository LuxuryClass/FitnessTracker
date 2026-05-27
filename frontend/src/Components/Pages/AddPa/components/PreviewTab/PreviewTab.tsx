import { useState, useMemo } from 'react';
import MuscleAccentComponent from '@/Components/Common/MuscleAccentComponent/MuscleAccentComponent';
import styles from './Styles.module.scss';
import { ExerciseRow } from '../../../../Common/ExerciseRow/ExerciseRow';
import { PreviewCard } from '@/Components/Common/PreviewCard/PreviewCard';

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  weight?: number;
}

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
  const [items, setItems] = useState(exercises);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  // Группы мышц из упражнений (уникальные)
  const muscleGroups = useMemo(() => {
    const groups = items.map(e => e.muscleGroup);
    return [...new Set(groups)];
  }, [items]);

  // Количество упражнений
  const exercisesCount = items.length;

  // Расчёт времени: 3мин на упражнение + 2мин перерыв = 5мин на упражнение
  const duration = useMemo(() => {
    const minutes = items.length * 5;
    return `${minutes}`;
  }, [items]);

  // Общий вес
  const totalWeight = useMemo(() => {
    const total = items.reduce((sum, e) => sum + (e.weight || 0), 0);
    if (total === 0) return '0';
    return `${total}`;
  }, [items]);

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
          {items.map((exercise, index) => (
            <ExerciseRow
            key={exercise.id}
            name={exercise.name}
            muscleGroup={exercise.muscleGroup}
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
          ))}
        </div>
      </div>

      <div className={styles.accentSection}>
        {/* <h3 className={styles.sectionTitle}>Акцент на мышцы</h3> */}
        <MuscleAccentComponent />
      </div>
    </div>
  );
};