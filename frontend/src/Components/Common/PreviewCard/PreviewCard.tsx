import { memo } from 'react';
import { MuscleGroupBadge } from '@/Components/Common/MuscleGroupBadge/MuscleGroupBadge';
import styles from './Styles.module.scss';
import cn from 'classnames';

interface PreviewCardProps {
  title?: string;
  duration?: string;
  totalWeight?: string;
  exercisesCount?: number;
  date?: string;
  time?: string;
  muscleGroups?: string[];
  description?: string;
  type?: 'default' | 'sessionPreview';
  onEdit?: () => void;
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
  description,
  type = 'default',
  onEdit,
  className,
}: PreviewCardProps) => {
  const displayDate = date
    ? `${formatDateDisplay(date)}${time ? ` • ${time}` : ''}`
    : '';

  if (type === 'sessionPreview') {
    return (
      <div className={cn(styles.card, styles.card_detailed, className)}>
        <h3 className={cn(styles.title, styles.title_detailed)}>{title}</h3>

        <div className={styles.metaDetailed}>
          {duration && (
            <div className={styles.metaDetailedItem}>
              <img src="/public/icons/Clock.svg" />
              <span>~{duration} мин</span>
            </div>
          )}
          {exercisesCount !== undefined && (
            <div className={styles.metaDetailedItem}>
              <img src="/public/icons/ExerciseCounter_White.svg"/>
              <span>{exercisesCount} упражнений</span>
            </div>
          )}
        </div>

        {muscleGroups.length > 0 && (
          <div className={styles.groups_session}>
            <MuscleGroupBadge className={styles.muscleGroupBadge} groups={muscleGroups} />
          </div>
        )}

        {description && (
          <>
            <div className={styles.divider} />
            <p className={styles.description}>{description}</p>
          </>
        )}

        {onEdit && (
          <button className={styles.editBtn} onClick={onEdit}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M15.2322 5.23223L18.7678 8.76777M16.7322 3.73223C17.7085 2.75592 19.2915 2.75592 20.2678 3.73223C21.2441 4.70854 21.2441 6.29146 20.2678 7.26777L6.5 21.0355H3V17.4645L16.7322 3.73223Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn(styles.card, className)}>
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
          {muscleGroups.map((group, index) => (
            <span key={index} className={styles.muscleTag}>{group}</span>
          ))}
        </div>
      )}
    </div>
  );
};

export const PreviewCard = memo(PreviewCardComponent);