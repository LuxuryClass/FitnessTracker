import { memo, useMemo } from 'react';
import styles from './Styles.module.scss';
import cn from 'classnames';
import { MuscleGroupBadge } from '@/Components/Common/MuscleGroupBadge/MuscleGroupBadge';
import type { ExerciseSet } from '@/Auth/authApi';

interface ExerciseRowProps {
  name: string;
  muscleGroup: string;
  sets?: ExerciseSet[];
  index: number;
  isDragging: boolean;
  isOver: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

const ExerciseRowComponent = ({
  name,
  muscleGroup,
  sets = [],
  isDragging,
  isOver,
  onDragStart,
  onDragOver,
  onDragEnd,
}: ExerciseRowProps) => {
  // Находим подход с максимальным весом
  const maxSet = useMemo(() => {
    if (sets.length === 0) return null;
    return sets.reduce((max, set) => set.weight > max.weight ? set : max, sets[0]);
  }, [sets]);

  return (
    <div
      className={cn(
        styles.row,
        isDragging && styles.row_dragging,
        isOver && styles.row_over
      )}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className={styles.handle}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="3" width="12" height="2" rx="1" fill="currentColor"/>
          <rect x="2" y="7" width="12" height="2" rx="1" fill="currentColor"/>
          <rect x="2" y="11" width="12" height="2" rx="1" fill="currentColor"/>
        </svg>
      </div>
      <div className={styles.info}>
        <span className={styles.name}>{name}</span>
        <div className={styles.right}>
          {maxSet && (
            <span className={styles.maxWeight}>
              {maxSet.weight} × {maxSet.reps}
            </span>
          )}
          <MuscleGroupBadge groups={[muscleGroup]} />
        </div>
      </div>
    </div>
  );
};

export const ExerciseRow = memo(ExerciseRowComponent);