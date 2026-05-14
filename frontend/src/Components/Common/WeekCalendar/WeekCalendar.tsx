import { memo, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { addWeeks, subWeeks, startOfWeek, format } from 'date-fns';
import styles from './Styles.module.scss';
import cn from 'classnames';

interface WeekCalendarProps {
  plannedDates?: Date[];
  completedDates?: Date[];
  className?: string;
}

const DAY_NAMES = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

const getWeekDays = (weekStart: Date, plannedSet: Set<string>, completedSet: Set<string>) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const dateKey = format(date, 'yyyy-MM-dd');
    const isToday = date.getTime() === today.getTime();
    let status: 'none' | 'planned' | 'completed' = 'none';
    if (completedSet.has(dateKey)) status = 'completed';
    else if (plannedSet.has(dateKey)) status = 'planned';
    days.push({
      dayName: DAY_NAMES[i],
      date: date.getDate(),
      status,
      isToday,
      fullDate: new Date(date),
    });
  }
  return days;
};

const WeekCalendarComponent = ({ 
  plannedDates = [], 
  completedDates = [],
  className 
}: WeekCalendarProps) => {
  const navigate = useNavigate();
  const today = new Date();
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(today, { weekStartsOn: 1 }));
  const [isAnimating, setIsAnimating] = useState(false);
  const [position, setPosition] = useState<'center' | 'left' | 'right'>('center');
  const [withTransition, setWithTransition] = useState(true);
  const touchStartX = useRef(0);

  const plannedSet = useMemo(() => new Set(plannedDates.map(d => format(d, 'yyyy-MM-dd'))), [plannedDates]);
  const completedSet = useMemo(() => new Set(completedDates.map(d => format(d, 'yyyy-MM-dd'))), [completedDates]);

  const prevWeekStart = subWeeks(currentWeekStart, 1);
  const nextWeekStart = addWeeks(currentWeekStart, 1);

  const prevDays = useMemo(() => getWeekDays(prevWeekStart, plannedSet, completedSet), [prevWeekStart, plannedSet, completedSet]);
  const currentDays = useMemo(() => getWeekDays(currentWeekStart, plannedSet, completedSet), [currentWeekStart, plannedSet, completedSet]);
  const nextDays = useMemo(() => getWeekDays(nextWeekStart, plannedSet, completedSet), [nextWeekStart, plannedSet, completedSet]);

  const goToWeek = (direction: 'prev' | 'next') => {
    if (isAnimating) return;
    setIsAnimating(true);
    setWithTransition(true);
    setPosition(direction === 'next' ? 'left' : 'right');
    setTimeout(() => {
      setCurrentWeekStart(prev => direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1));
      setWithTransition(false);
      setPosition('center');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setWithTransition(true);
          setIsAnimating(false);
        });
      });
    }, 300);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isAnimating) return;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diffX) > 50) {
      if (diffX > 0) goToWeek('next');
      else goToWeek('prev');
    }
  };

  const handleDayClick = (date: Date) => {
    navigate('/schedule', { state: { selectedDate: date.toISOString() } });
  };

  const renderWeek = (days: ReturnType<typeof getWeekDays>) => (
    <div className={styles.daysRow}>
      {days.map((day) => (
        <div 
          key={day.dayName} 
          className={cn(styles.day, day.isToday && styles.day_today)}
          onClick={() => handleDayClick(day.fullDate)}
        >
          <div className={styles.date_wrapper}>
            <span className={cn(styles.dayName, day.isToday && styles.dayName_today)}>{day.dayName}</span>
            <div className={cn(styles.date, day.isToday && styles.date_today)}>{day.date}</div>
          </div>
          <div className={styles.indicator}>
            {day.status === 'planned' && (
              <div className={cn(styles.dot, styles.dot_planned, day.isToday && styles.dot_planned_today)} />
            )}
            {day.status === 'completed' && (
              <div className={cn(styles.dot, styles.dot_completed, day.isToday && styles.dot_completed_today)} />
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className={cn(styles.weekSlider, className)}>
      <div className={styles.daysWrapper} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className={cn(
          styles.sliderTrack,
          position === 'left' && styles.sliderTrack_left,
          position === 'right' && styles.sliderTrack_right,
          !withTransition && styles.sliderTrack_noTransition
        )}>
          <div className={styles.weekSlide}>{renderWeek(prevDays)}</div>
          <div className={styles.weekSlide}>{renderWeek(currentDays)}</div>
          <div className={styles.weekSlide}>{renderWeek(nextDays)}</div>
        </div>
      </div>
    </div>
  );
};

export const WeekCalendar = memo(WeekCalendarComponent);