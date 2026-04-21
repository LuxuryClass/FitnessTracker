import { memo, useMemo } from 'react';
import styles from './Styles.module.scss';
import cn from 'classnames';

interface WeekCalendarProps {
  plannedDates?: Date[];
  completedDates?: Date[];
  className?: string;
}

const DAY_NAMES = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

const WeekCalendarComponent = ({ 
  plannedDates = [], 
  completedDates = [],
  className 
}: WeekCalendarProps) => {
  
  const weekDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const currentDayOfWeek = today.getDay();
    const monday = new Date(today);
    const daysToSubtract = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
    monday.setDate(today.getDate() - daysToSubtract);
    
    const plannedSet = new Set(
      plannedDates.map(d => new Date(d).toISOString().split('T')[0])
    );
    const completedSet = new Set(
      completedDates.map(d => new Date(d).toISOString().split('T')[0])
    );
    
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      
      const dateKey = date.toISOString().split('T')[0];
      const isToday = date.getTime() === today.getTime();
      
      let status: 'none' | 'planned' | 'completed' = 'none';
      if (completedSet.has(dateKey)) {
        status = 'completed';
      } else if (plannedSet.has(dateKey)) {
        status = 'planned';
      }
      
      days.push({
        dayName: DAY_NAMES[i],
        date: date.getDate(),
        status,
        isToday,
      });
    }
    
    return days;
  }, [plannedDates, completedDates]);

  return (
    <div className={cn(styles.calendar, className)}>
      {weekDays.map((day) => (
        <div 
          key={day.dayName} 
          className={cn(styles.day, day.isToday && styles.day_today)}
        >
          <div className={styles.date_wrapper}>
            <span className={cn(styles.dayName, day.isToday && styles.dayName_today)}>
              {day.dayName}
            </span>
            <div className={cn(styles.date, day.isToday && styles.date_today)}>
              {day.date}
            </div>
          </div>
          <div className={styles.indicator}>
            {day.status === 'planned' && (
              <div className={cn(
                styles.dot, 
                styles.dot_planned,
                day.isToday && styles.dot_planned_today
              )} />
            )}
            {day.status === 'completed' && (
              <div className={cn(
                styles.dot, 
                styles.dot_completed,
                day.isToday && styles.dot_completed_today
              )} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export const WeekCalendar = memo(WeekCalendarComponent);