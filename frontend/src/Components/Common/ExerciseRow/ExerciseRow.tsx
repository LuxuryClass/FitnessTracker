import { memo, useMemo } from 'react';
import styles from './Styles.module.scss';
import cn from 'classnames';
import { MuscleGroupBadge } from '@/Components/Common/MuscleGroupBadge/MuscleGroupBadge';
import type { ExerciseSet } from '@/Auth/authApi';
import { aggregateSets, formatSetsSummary } from '@/Utils/setsFormat';

interface ExerciseRowProps {
  name: string;
  muscleGroups: string[];
  targetMuscles: string[];
  sets?: ExerciseSet[];
  index: number;
  isDragging: boolean;
  isOver: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onClick?: () => void;
}

const ExerciseRowComponent = ({
  name,
  muscleGroups,
  targetMuscles,
  sets = [],
  isDragging,
  isOver,
  onDragStart,
  onDragOver,
  onDragEnd,
  onClick,
}: ExerciseRowProps) => {
  // Агрегированная сводка подходов: «4 × 8–12 • 60–80кг».
  const setsLabel = useMemo(() => formatSetsSummary(aggregateSets(sets)), [sets]);

  const primarySet = new Set(muscleGroups);
  const secondaryMuscles = targetMuscles.filter(m => !primarySet.has(m));

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
      onClick={onClick}
    >
      <div className={styles.handle}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="3" width="12" height="2" rx="1" fill="currentColor"/>
          <rect x="2" y="7" width="12" height="2" rx="1" fill="currentColor"/>
          <rect x="2" y="11" width="12" height="2" rx="1" fill="currentColor"/>
        </svg>
      </div>
      <div className={styles.info}>
        <div className={styles.topRow}>
          <span className={styles.name}>{name}</span>
          {setsLabel && (
            <span className={styles.maxWeight}>
              {setsLabel}
            </span>
          )}
        </div>
        {(muscleGroups.length > 0 || secondaryMuscles.length > 0) && (
          <MuscleGroupBadge
            groups={[...muscleGroups, ...secondaryMuscles]}
            primaryGroups={muscleGroups}
          />
        )}
      </div>
    </div>
  );
};

export const ExerciseRow = memo(ExerciseRowComponent);