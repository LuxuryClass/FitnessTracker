import { memo, useMemo } from 'react';
import { MuscleGroupBadge } from '@/Components/Common/MuscleGroupBadge/MuscleGroupBadge';
import styles from './Styles.module.scss';
import cn from 'classnames';

interface WorkoutCardProps {
  title: string;
  date?: Date;
  time?: string;
  exercisesCount?: number;
  muscleGroups?: string[];
  status?: 'planned' | 'completed';
  onClick?: () => void;
  onArrowClick?: () => void;
  className?: string;
}

const MONTH_NAMES = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

const formatDate = (date: Date): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  
  if (target.getTime() === today.getTime()) return 'Сегодня';
  if (target.getTime() === tomorrow.getTime()) return 'Завтра';
  
  return `${target.getDate()} ${MONTH_NAMES[target.getMonth()]}`; // ← 2 мая вместо мая 2
};

const WorkoutCardComponent = ({
  title,
  date,
  time,
  muscleGroups,
  status,
  className,
  onClick,
  onArrowClick,
}: WorkoutCardProps) => {
  const displayDate = useMemo(() => formatDate(date || new Date()), [date]);
  const isCompleted = status === 'completed';

  return (
    <div className={cn(styles.card, isCompleted && styles.card_completed, className)} onClick={onClick}>
      <div className={styles.topRow}>
        <div className={styles.topRowLeft}>
          <span className={styles.dateText}>{displayDate}</span>
          {time && <span className={styles.time}>{time}</span>}
        </div>
        {isCompleted && <span className={styles.completedBadge}>✓ Завершена</span>}
      </div>

      <div className={styles.cardBody}>
        <div className={styles.cardContent}>
          <h3 className={styles.title}>{title}</h3>
          <div className={styles.bottomRow}>
            {muscleGroups && muscleGroups.length > 0 && (
              <MuscleGroupBadge groups={muscleGroups} type="block" />
            )}
          </div>
        </div>

        <div className={styles.arrow} onClick={onArrowClick}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  );
};

export const WorkoutCard = memo(WorkoutCardComponent);