import { memo, useMemo } from 'react';
import { MuscleGroupBadge } from '@/Components/Common/MuscleGroupBadge/MuscleGroupBadge';
import styles from './Styles.module.scss';
import exercisesIcon from '/icons/ExerciseCounter_Grey.svg';

interface WorkoutCardProps {
  title: string;
  date?: Date;
  time?: string;
  exercisesCount?: number;
  muscleGroups?: string[];
  onClick?: () => void;
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
  exercisesCount,
  muscleGroups,
  onClick,
}: WorkoutCardProps) => {
  const displayDate = useMemo(() => formatDate(date || new Date()), [date]);

  return (
    <div className={styles.card} onClick={onClick}>
      <div className={styles.cardContent}>
        <div className={styles.topRow}>
          <span className={styles.dateText}>{displayDate}</span>
          {time && <span className={styles.time}>{time}</span>}
        </div>

        <h3 className={styles.title}>{title}</h3>

        <div className={styles.bottomRow}>
          {exercisesCount !== undefined && exercisesCount > 0 && (
            <span className={styles.count}>
              <img src={exercisesIcon} alt="" className={styles.countIcon} />
              {exercisesCount} упр
            </span>
          )}

          {muscleGroups && muscleGroups.length > 0 && (
            <MuscleGroupBadge groups={muscleGroups} />
          )}
        </div>
      </div>

      <div className={styles.arrow}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
};

export const WorkoutCard = memo(WorkoutCardComponent);