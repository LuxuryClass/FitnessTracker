import { memo } from 'react';
import { MuscleGroupBadge } from '@/Components/Common/MuscleGroupBadge/MuscleGroupBadge';
import styles from './Styles.module.scss';

interface PreviewCardProps {
  title?: string;
  duration?: string;
  totalWeight?: string;
  exercisesCount?: number;
  date?: string;
  time?: string;
  muscleGroups?: string[];
  className?: string;
}

const DAY_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTH_NAMES = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

const formatDateDisplay = (dateStr: string): string => {
  const date = new Date(dateStr);
  return `${DAY_NAMES[date.getDay()]}. ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
};

const PreviewCardComponent = ({
  title = 'Новая тренировка',
  duration,
  totalWeight,
  exercisesCount,
  date,
  time,
  muscleGroups = [],
  className,
}: PreviewCardProps) => {
  const displayDate = date
    ? `${formatDateDisplay(date)}${time ? ` • ${time}` : ''}`
    : '';

  return (
    <div className={`${styles.card} ${className || ''}`}>
      <div className={styles.header}>
        {displayDate && (
          <span className={styles.date}>{displayDate}</span>
        )}
        <h3 className={styles.title}>{title}</h3>
      </div>

      <div className={styles.meta}>
        {exercisesCount !== undefined && (
          <div className={styles.metaItem}>
            <span className={styles.metaValue}>{exercisesCount}</span>
            <span className={styles.metaLabel}>Упражнений</span>
          </div>
        )}

        <span className={styles.dot}>•</span>

        {duration && (
          <div className={styles.metaItem}>
            <span className={styles.metaValue}>~{duration}</span>
            <span className={styles.metaLabel}>Минут</span>
          </div>
        )}

        <span className={styles.dot}>•</span>
        
        {totalWeight && (
          <div className={styles.metaItem}>
            <span className={styles.metaValue}>{totalWeight} т</span>
            <span className={styles.metaLabel}>Общий вес</span>
          </div>
        )}
      </div>

      {muscleGroups.length > 0 && (
        <div className={styles.groups}>
          <MuscleGroupBadge groups={muscleGroups} />
        </div>
      )}
    </div>
  );
};

export const PreviewCard = memo(PreviewCardComponent);