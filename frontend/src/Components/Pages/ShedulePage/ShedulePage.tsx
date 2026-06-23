import { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { startOfMonth } from 'date-fns';
import { Button } from '@/Components/UI/Button/Button';
import { MonthCalendar } from '@/Components/Common/MonthCalendar/MonthCalendar';
import { WorkoutCard } from '@/Components/Common/WorkoutCard/WorkoutCard';
import styles from './Styles.module.scss';
import { Link } from 'react-router-dom';
import { useScheduleQuery } from '@/hooks/useScheduleQuery';
import { labelsForPrimaryList } from '@/Utils/muscleGroups';

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
  const navigate = useNavigate();
  const passedDateStr = (location.state as any)?.selectedDate as string | undefined;
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(
    passedDateStr ? new Date(passedDateStr) : today
  );
  const [monthRange, setMonthRange] = useState(() => getMonthRange(startOfMonth(selectedDate)));

  const { data: workouts = [] } = useScheduleQuery(monthRange.from, monthRange.to);

  const handleMonthChange = useCallback((monthStart: Date) => {
    setMonthRange(getMonthRange(monthStart));
  }, []);

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
        <Button size="back" onClick={() => navigate(-1)} />
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
                  muscleGroups={labelsForPrimaryList(workout.muscle_groups)}
                  date={new Date(workout.date)}
                  status={workout.status}
                  onClick={() => navigate(`/workout/${workout.id}`)}
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