import { memo, useMemo, useState, useRef, useCallback } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  format,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import styles from './Styles.module.scss';
import cn from 'classnames';

interface MonthCalendarProps {
  plannedDates?: Date[];
  completedDates?: Date[];
  onDayClick?: (date: Date) => void;
  initialDate?: Date;
  className?: string;
}

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const getMonthDays = (
  month: Date,
  plannedSet: Set<string>,
  completedSet: Set<string>
) => {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd }).map(date => {
    const dateKey = format(date, 'yyyy-MM-dd');
    let status = 'none';
    if (completedSet.has(dateKey)) status = 'completed';
    else if (plannedSet.has(dateKey)) status = 'planned';

    return {
      date,
      dayNumber: date.getDate(),
      status: status as 'none' | 'planned' | 'completed',
      isCurrentMonth: isSameMonth(date, month),
      isToday: isToday(date),
    };
  });

  // Обрезаем до 35 дней (5 недель)
  return allDays.slice(0, 35);
};

const MonthCalendarComponent = ({
  plannedDates = [],
  completedDates = [],
  onDayClick,
  initialDate,
  className,
}: MonthCalendarProps) => {
  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(
    startOfMonth(initialDate || today)
  );

  const [selectedDate, setSelectedDate] = useState<Date>(
    initialDate || today
  );

  const [isAnimating, setIsAnimating] =
    useState(false);

  const [position, setPosition] = useState<
    'center' | 'left' | 'right'
  >('center');

  const [withTransition, setWithTransition] =
    useState(true);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const plannedSet = useMemo(
    () =>
      new Set(
        plannedDates.map(d =>
          format(d, 'yyyy-MM-dd')
        )
      ),
    [plannedDates]
  );

  const completedSet = useMemo(
    () =>
      new Set(
        completedDates.map(d =>
          format(d, 'yyyy-MM-dd')
        )
      ),
    [completedDates]
  );

  const prevMonth = subMonths(currentMonth, 1);
  const nextMonth = addMonths(currentMonth, 1);

  const prevDays = useMemo(
    () =>
      getMonthDays(
        prevMonth,
        plannedSet,
        completedSet
      ),
    [prevMonth, plannedSet, completedSet]
  );

  const currentDays = useMemo(
    () =>
      getMonthDays(
        currentMonth,
        plannedSet,
        completedSet
      ),
    [currentMonth, plannedSet, completedSet]
  );

  const nextDays = useMemo(
    () =>
      getMonthDays(
        nextMonth,
        plannedSet,
        completedSet
      ),
    [nextMonth, plannedSet, completedSet]
  );

  const monthTitle = format(
    currentMonth,
    'LLLL yyyy',
    {
      locale: ru,
    }
  );

  const displayTitle =
    monthTitle.charAt(0).toUpperCase() +
    monthTitle.slice(1);

  const goToMonth = useCallback(
    (direction: 'prev' | 'next') => {
      if (isAnimating) return;

      setIsAnimating(true);

      setWithTransition(true);

      setPosition(
        direction === 'next'
          ? 'left'
          : 'right'
      );

      setTimeout(() => {
        setCurrentMonth(prev =>
          direction === 'next'
            ? addMonths(prev, 1)
            : subMonths(prev, 1)
        );

        // моментально вернуть в центр
        setWithTransition(false);

        setPosition('center');

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setWithTransition(true);
            setIsAnimating(false);
          });
        });
      }, 300);
    },
    [isAnimating]
  );

  const handleTouchStart = (
    e: React.TouchEvent
  ) => {
    touchStartX.current =
      e.touches[0].clientX;

    touchStartY.current =
      e.touches[0].clientY;
  };

  const handleTouchEnd = (
    e: React.TouchEvent
  ) => {
    if (isAnimating) return;

    const diffX =
      touchStartX.current -
      e.changedTouches[0].clientX;

    const diffY =
      touchStartY.current -
      e.changedTouches[0].clientY;

    if (
      Math.abs(diffX) > Math.abs(diffY) &&
      Math.abs(diffX) > 50
    ) {
      if (diffX > 0) {
        goToMonth('next');
      } else {
        goToMonth('prev');
      }
    }
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);

    onDayClick?.(date);
  };

    const renderMonth = (monthDays: ReturnType<typeof getMonthDays>) => {
    return (
        <div className={styles.daysGrid}>
        {monthDays.map((day, index) => {
            const isSelectedDay =
            day.isCurrentMonth &&
            isSameDay(day.date, selectedDate) &&
            isSameMonth(day.date, selectedDate); // ← дополнительная проверка

            return (
            <div key={index} className={styles.dayCell}>
                <div
                className={cn(
                    styles.day,
                    !day.isCurrentMonth && styles.day_otherMonth,
                    day.isToday && styles.day_today,
                    isSelectedDay && styles.day_selected
                )}
                onClick={() => handleDayClick(day.date)}
                >
                <span className={cn(
                    styles.dayNumber,
                    !day.isCurrentMonth && styles.dayNumber_otherMonth,
                    day.isToday && styles.dayNumber_today,
                    isSelectedDay && styles.dayNumber_selected
                )}>
                    {day.dayNumber}
                </span>
                {day.status !== 'none' && (
                    <div
                        className={cn(
                        styles.dot,
                        isSelectedDay && styles.dot_selected
                        )}
                    />
                )}
                </div>
            </div>
            );
        })}
        </div>
    );
    };

  return (
    <div
      className={cn(
        styles.calendar,
        className
      )}
    >
      {/* Header */}
      <div className={styles.monthHeader}>
        <button
          className={styles.arrow}
          onClick={() =>
            goToMonth('prev')
          }
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <h2 className={styles.monthTitle}>
          {displayTitle}
        </h2>

        <button
          className={styles.arrow}
          onClick={() =>
            goToMonth('next')
          }
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M9 18L15 12L9 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div className={styles.calendar__calendar}>
        {/* Days */}
        <div className={styles.dayNames}>
            {DAY_NAMES.map(name => (
            <span
                key={name}
                className={styles.dayName}
            >
                {name}
            </span>
            ))}
        </div>

        {/* Calendar slider */}
        <div
            className={styles.daysWrapper}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            <div
            className={cn(
                styles.sliderTrack,
                position === 'left' &&
                styles.sliderTrack_left,
                position === 'right' &&
                styles.sliderTrack_right,
                !withTransition &&
                styles.sliderTrack_noTransition
            )}
            >
            <div className={styles.monthSlide}>
                {renderMonth(prevDays)}
            </div>

            <div className={styles.monthSlide}>
                {renderMonth(currentDays)}
            </div>

            <div className={styles.monthSlide}>
                {renderMonth(nextDays)}
            </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export const MonthCalendar = memo(
  MonthCalendarComponent
);