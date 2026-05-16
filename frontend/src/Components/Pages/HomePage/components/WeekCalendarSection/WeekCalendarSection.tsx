import { memo } from 'react';
import { useNavigate } from 'react-router-dom';;
import styles from './Styles.module.scss';
import cn from 'classnames';
import { WeekCalendar } from '@/Components/Common/WeekCalendar/WeekCalendar';

interface WeekCalendarSectionProps {
  plannedDates?: Date[];
  completedDates?: Date[];
  onWeekChange?: (weekStart: Date, weekEnd: Date) => void;
  className?: string;
}

const WeekCalendarSectionComponent = ({
  plannedDates = [],
  completedDates = [],
  onWeekChange,
  className
}: WeekCalendarSectionProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/schedule');
  };

  return (
    <div className={cn(styles.wrapper, className)}>
      <div className={styles.header}>
        <h2 className={styles.title} onClick={handleClick}>
          Расписание <span className={styles.arrow}>›</span>
        </h2>
      </div>

      <WeekCalendar
        plannedDates={plannedDates}
        completedDates={completedDates}
        onWeekChange={onWeekChange}
      />
    </div>
  );
};

export const WeekCalendarSection = memo(WeekCalendarSectionComponent);