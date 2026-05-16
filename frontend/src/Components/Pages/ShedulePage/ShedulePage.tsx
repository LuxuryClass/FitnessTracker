import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { startOfMonth } from 'date-fns';
import { Button } from '@/Components/UI/Button/Button';
import { MonthCalendar } from '@/Components/Common/MonthCalendar/MonthCalendar';
import { WorkoutCard } from '@/Components/Common/WorkoutCard/WorkoutCard';
import styles from './Styles.module.scss';
import { Link } from 'react-router-dom';
import { authApi, ScheduleWorkoutItem } from '@/Auth/authApi';
import { useAuth } from '@/Auth';

const formatDate = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const getMonthRange = (month: Date): { from: string; to: string } => {
  const from = new Date(month.getFullYear(), month.getMonth(), 1);
  const to = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  return { from: formatDate(from), to: formatDate(to) };
};

const SchedulePage = () => {
  const location = useLocation();
  const { tokens } = useAuth();
  const passedDateStr = (location.state as any)?.selectedDate as string | undefined;
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(
    passedDateStr ? new Date(passedDateStr) : today
  );
  const [workouts, setWorkouts] = useState<ScheduleWorkoutItem[]>([]);

  const fetchMonth = useCallback(async (month: Date) => {
    if (!tokens?.accessToken) return;
    const { from, to } = getMonthRange(month);
    try {
      const data = await authApi.getSchedule(tokens.accessToken, from, to);
      setWorkouts(prev => {
        // Заменяем данные за этот месяц, сохраняя остальные
        const filtered = prev.filter(w => w.date < from || w.date > to);
        return [...filtered, ...data];
      });
    } catch (error) {
      console.error('Не удалось загрузить расписание:', error);
    }
  }, [tokens?.accessToken]);

  // Загружаем текущий месяц при маунте
  useEffect(() => {
    fetchMonth(startOfMonth(selectedDate));
  }, [tokens?.accessToken]);

  const handleMonthChange = useCallback((monthStart: Date) => {
    fetchMonth(monthStart);
  }, [fetchMonth]);

  const plannedDates = workouts
    .filter(w => w.status === 'planned')
    .map(w => new Date(w.date));

  const completedDates = workouts
    .filter(w => w.status === 'completed')
    .map(w => new Date(w.date));

  const selectedDateStr = formatDate(selectedDate);
  const selectedWorkouts = workouts
    .filter(w => w.date === selectedDateStr)
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button size="back" />
        <h1 className={styles.title}>Расписание</h1>
      </div>

      <MonthCalendar
        plannedDates={plannedDates}
        completedDates={completedDates}
        onDayClick={handleDayClick}
        onMonthChange={handleMonthChange}
        initialDate={selectedDate}
        className={styles.calendarWrapper}
      />

      <div className={styles.workoutsSection}>
        <h2 className={styles.sectionTitle}>
          Тренировки на {selectedDate.toLocaleDateString('ru', { month: 'long', day: 'numeric' })}
        </h2>

        {selectedWorkouts.length > 0 ? (
          <div className={styles.workoutsList}>
            {selectedWorkouts.map(workout => (
              <div key={workout.id} className={styles.workoutCard}>
                <WorkoutCard
                  title={workout.title}
                  time={workout.time ?? undefined}
                  exercisesCount={workout.exercises_count}
                  muscleGroups={workout.muscle_groups}
                  date={new Date(workout.date)}
                  onClick={() => console.log('Открыть тренировку', workout.id)}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyText}>На этот день не запланирована тренировка</p>
        )}
      </div>

      <Link
        to="/add"
        state={{ scheduleDate: selectedDate, startType: 'schedule' }}
        className={styles.planLink}
      >
        Запланировать тренировку
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={styles.planArrow}>
          <path d="M5 12H19M19 12L14 7M19 12L14 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </Link>
    </div>
  );
};

export default SchedulePage;