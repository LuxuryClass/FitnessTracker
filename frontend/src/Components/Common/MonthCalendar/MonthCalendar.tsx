import { memo, useMemo, useState, useRef, useCallback, useEffect } from "react";
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
} from "date-fns";
import { ru } from "date-fns/locale";
import styles from "./Styles.module.scss";
import cn from "classnames";

interface MonthCalendarProps {
  plannedDates?: Date[];
  completedDates?: Date[];
  markedDates?: Date[];
  activeDate?: Date | null;
  onDayClick?: (date: Date) => void;
  onMonthChange?: (monthStart: Date) => void;
  initialDate?: Date;
  className?: string;
}

const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const getMonthDays = (
  month: Date,
  plannedSet: Set<string>,
  completedSet: Set<string>,
) => {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const allDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  }).map((date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    let status = "none";
    if (completedSet.has(dateKey)) status = "completed";
    else if (plannedSet.has(dateKey)) status = "planned";

    return {
      date,
      dayNumber: date.getDate(),
      status: status as "none" | "planned" | "completed",
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
  markedDates,
  activeDate,
  onDayClick,
  onMonthChange,
  initialDate,
  className,
}: MonthCalendarProps) => {
  const today = new Date();

  // родитель управляет подсветкой через
  // markedDates/activeDate, внутренний single-select (selectedDate) не используется.
  const isControlled = markedDates !== undefined;

  const [currentMonth, setCurrentMonth] = useState(
    startOfMonth(initialDate || today),
  );

  const [selectedDate, setSelectedDate] = useState<Date>(initialDate || today);

  const [isAnimating, setIsAnimating] = useState(false);

  const [position, setPosition] = useState<"center" | "left" | "right">(
    "center",
  );

  const [withTransition, setWithTransition] = useState(true);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const plannedSet = useMemo(
    () => new Set(plannedDates.map((d) => format(d, "yyyy-MM-dd"))),
    [plannedDates],
  );

  const completedSet = useMemo(
    () => new Set(completedDates.map((d) => format(d, "yyyy-MM-dd"))),
    [completedDates],
  );

  const markedSet = useMemo(
    () => new Set((markedDates ?? []).map((d) => format(d, "yyyy-MM-dd"))),
    [markedDates],
  );

  const activeKey = activeDate ? format(activeDate, "yyyy-MM-dd") : null;

  const prevMonth = subMonths(currentMonth, 1);
  const nextMonth = addMonths(currentMonth, 1);

  const prevDays = useMemo(
    () => getMonthDays(prevMonth, plannedSet, completedSet),
    [prevMonth, plannedSet, completedSet],
  );

  const currentDays = useMemo(
    () => getMonthDays(currentMonth, plannedSet, completedSet),
    [currentMonth, plannedSet, completedSet],
  );

  const nextDays = useMemo(
    () => getMonthDays(nextMonth, plannedSet, completedSet),
    [nextMonth, plannedSet, completedSet],
  );

  const monthTitle = format(currentMonth, "LLLL yyyy", {
    locale: ru,
  });

  const displayTitle = monthTitle.charAt(0).toUpperCase() + monthTitle.slice(1);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;

    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isAnimating) return;

    const diffX = touchStartX.current - e.changedTouches[0].clientX;

    const diffY = touchStartY.current - e.changedTouches[0].clientY;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX > 0) {
        goToMonth("next");
      } else {
        goToMonth("prev");
      }
    }
  };
  const pendingCallbackRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isAnimating && pendingCallbackRef.current) {
      pendingCallbackRef.current();
      pendingCallbackRef.current = null;
    }
  }, [isAnimating]);

  const goToMonth = useCallback(
    (direction: "prev" | "next", onComplete?: () => void) => {
      if (isAnimating) return;

      setIsAnimating(true);
      setWithTransition(true);
      setPosition(direction === "next" ? "left" : "right");

      if (onComplete) {
        pendingCallbackRef.current = onComplete;
      }

      setTimeout(() => {
        setCurrentMonth((prev) => {
          const next =
            direction === "next" ? addMonths(prev, 1) : subMonths(prev, 1);
          onMonthChange?.(next);
          return next;
        });

        setWithTransition(false);
        setPosition("center");

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setWithTransition(true);
            setIsAnimating(false);
          });
        });
      }, 300);
    },
    [isAnimating, onMonthChange],
  );

  const handleDayClick = (date: Date) => {
    if (!isSameMonth(date, currentMonth)) {
      if (!isControlled) {
        setSelectedDate(new Date(0));
      }

      const direction = date > currentMonth ? "next" : "prev";
      goToMonth(direction, () => {
        if (!isControlled) setSelectedDate(date);
        onDayClick?.(date);
      });
      return;
    }

    if (!isControlled) {
      setSelectedDate(date);
    }
    onDayClick?.(date);
  };

  const renderMonth = (monthDays: ReturnType<typeof getMonthDays>) => {
    return (
      <div className={styles.daysGrid}>
        {monthDays.map((day) => {
          const dayKey = format(day.date, "yyyy-MM-dd");
          // сплошная заливка — только в неконтролируемом режиме.
          const isSelectedDay =
            !isControlled &&
            day.isCurrentMonth &&
            isSameDay(day.date, selectedDate);
          // Контролируемый режим: пунктирная обводка (marked) + сплошная обводка (active).
          const isMarked = day.isCurrentMonth && markedSet.has(dayKey);
          const isActive = day.isCurrentMonth && activeKey === dayKey;

          return (
            <div key={dayKey} className={styles.dayCell}>
              <div
                className={cn(
                  styles.day,
                  !day.isCurrentMonth && styles.day_otherMonth,
                  day.isToday && styles.day_today,
                  isSelectedDay && styles.day_selected,
                  isMarked && styles.day_marked,
                  isActive && styles.day_active,
                )}
                onClick={() => handleDayClick(day.date)}
              >
                <span
                  className={cn(
                    styles.dayNumber,
                    !day.isCurrentMonth && styles.dayNumber_otherMonth,
                    day.isToday && styles.dayNumber_today,
                    isSelectedDay && styles.dayNumber_selected,
                  )}
                >
                  {day.dayNumber}
                </span>
                {day.status !== "none" && (
                  <div
                    className={cn(
                      styles.dot,
                      isSelectedDay && styles.dot_selected,
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
    <div className={cn(styles.calendar, className)}>
      {/* Header */}
      <div className={styles.monthHeader}>
        <button className={styles.arrow} onClick={() => goToMonth("prev")}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <h2 className={styles.monthTitle}>{displayTitle}</h2>

        <button className={styles.arrow} onClick={() => goToMonth("next")}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
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
          {DAY_NAMES.map((name) => (
            <span key={name} className={styles.dayName}>
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
              position === "left" && styles.sliderTrack_left,
              position === "right" && styles.sliderTrack_right,
              !withTransition && styles.sliderTrack_noTransition,
            )}
          >
            <div className={styles.monthSlide}>{renderMonth(prevDays)}</div>

            <div className={styles.monthSlide}>{renderMonth(currentDays)}</div>

            <div className={styles.monthSlide}>{renderMonth(nextDays)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const MonthCalendar = memo(MonthCalendarComponent);
