import { memo } from 'react';
import { useNavigate } from 'react-router-dom';;
import styles from './Styles.module.scss';
import cn from 'classnames';
import { WeekCalendar } from '@/Components/Common/WeekCalendar/WeekCalendar';

interface WeekCalendarSectionProps {
  plannedDates?: Date[];
  completedDates?: Date[];
  className?: string;
}

const WeekCalendarSectionComponent = ({ 
  plannedDates = [], 
  completedDates = [],
  className 
}: WeekCalendarSectionProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/schedule');
  };

  return (
    <div className={cn(styles.wrapper, className)} onClick={handleClick}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          Расписание <span className={styles.arrow}>›</span>
        </h2>
      </div>
      
      <WeekCalendar plannedDates={plannedDates} completedDates={completedDates} />
    </div>
  );
};

export const WeekCalendarSection = memo(WeekCalendarSectionComponent);