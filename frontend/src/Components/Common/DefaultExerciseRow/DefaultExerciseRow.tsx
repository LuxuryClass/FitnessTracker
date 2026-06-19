import { memo, useMemo } from 'react';
import styles from './Styles.module.scss';
import cn from 'classnames';
import { MuscleGroupBadge } from '@/Components/Common/MuscleGroupBadge/MuscleGroupBadge';
import type { ExerciseSet } from '@/Auth/authApi';
// import { aggregateSets, formatSetsSummary } from '@/Utils/setsFormat';

interface DefaultExerciseRowProps {
  name: string;
  muscleGroups: string[];
  targetMuscles: string[];
  sets?: ExerciseSet[];
  index: number;
  isDragging: boolean;
  isOver: boolean;
  
  showDrag?: boolean;
  showMuscleGroups?: boolean;
  showImage?: boolean;
  imageUrl?: string;
  
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onClick?: () => void;
}

const DefaultExerciseRowComponent = ({
  name,
  muscleGroups,
  targetMuscles,
  sets = [],
  isDragging = false,
  isOver,
  showDrag = false,
  showMuscleGroups = true,
  showImage = false,
  imageUrl,
  onDragStart,
  onDragOver,
  onDragEnd,
  onClick,
}: DefaultExerciseRowProps) => {
  // const setsLabel = useMemo(() => formatSetsSummary(aggregateSets(sets)), [sets]);
  const setsLabel = useMemo(() => {
    const count = sets.length;
    if (count === 0) return null;
    const mod10 = count % 10;
    const mod100 = count % 100;
    let word: string;
    if (mod10 === 1 && mod100 !== 11) word = 'подход';
    else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) word = 'подхода';
    else word = 'подходов';
    return `${count} ${word}`;
  }, [sets]);

  const primarySet = new Set(muscleGroups);
  const secondaryMuscles = targetMuscles.filter(m => !primarySet.has(m));

  return (
    <div
      className={cn(
        styles.row,
        showDrag && styles.row_draggable,
        isDragging && styles.row_dragging,
        isOver && styles.row_over
      )}
      draggable={showDrag}
      onDragStart={showDrag ? onDragStart : undefined}
      onDragOver={showDrag ? onDragOver : undefined}
      onDragEnd={showDrag ? onDragEnd : undefined}
      onClick={onClick}
    >
      {showDrag && (
        <div className={styles.handle}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="3" width="12" height="2" rx="1" fill="currentColor"/>
            <rect x="2" y="7" width="12" height="2" rx="1" fill="currentColor"/>
            <rect x="2" y="11" width="12" height="2" rx="1" fill="currentColor"/>
          </svg>
        </div>
      )}

      {showImage && (
        <div className={styles.image}>
          {imageUrl && (
            <img 
              src={imageUrl} 
              alt={name}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
        </div>
      )}

      <div className={styles.info}>
        <div className={styles.topRow}>
          <span className={styles.name}>{name}</span>
          {setsLabel && (
            <span className={styles.maxWeight}>
              {setsLabel}
            </span>
          )}
        </div>
        {showMuscleGroups && (muscleGroups.length > 0 || secondaryMuscles.length > 0) && (
          <MuscleGroupBadge
            type='block'
            groups={[...muscleGroups, ...secondaryMuscles]}
            primaryGroups={muscleGroups}
          />
        )}
      </div>
    </div>
  );
};

export const DefaultExerciseRow = memo(DefaultExerciseRowComponent);