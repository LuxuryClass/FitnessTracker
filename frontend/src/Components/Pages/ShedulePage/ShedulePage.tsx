import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/Components/UI/Button/Button';
import { MonthCalendar } from '@/Components/Common/MonthCalendar/MonthCalendar';
import { WorkoutCard } from '@/Components/Common/WorkoutCard/WorkoutCard';
import styles from './Styles.module.scss';
import { Link } from 'react-router-dom';

interface WorkoutDay {
  id: string;
  title: string;
  time: string;
  exercisesCount: number;
  muscleGroups: string[];
  date: Date;
}

const SchedulePage = () => {
  const location = useLocation();
  const passedDateStr = (location.state as any)?.selectedDate as string | undefined;
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(
    passedDateStr ? new Date(passedDateStr) : today
  );

  const workouts: WorkoutDay[] = [
    {
      id: '1',
      title: 'День жимов',
      time: '9:30',
      exercisesCount: 6,
      muscleGroups: ['Грудь', 'Плечи'],
      date: new Date(today.getFullYear(), today.getMonth(), 2),
    },
    {
      id: '2',
      title: 'День ног',
      time: '17:00',
      exercisesCount: 5,
      muscleGroups: ['Ноги', 'Ягодицы'],
      date: new Date(today.getFullYear(), today.getMonth(), 2),
    },
    {
      id: '3',
      title: 'День спины',
      time: '19:30',
      exercisesCount: 4,
      muscleGroups: ['Спина', 'Бицепс'],
      date: new Date(today.getFullYear(), today.getMonth(), 8),
    },
  ];

  const plannedDates = workouts.map(w => w.date);

  const selectedWorkouts = workouts
    .filter(w => w.date.toISOString().split('T')[0] === selectedDate.toISOString().split('T')[0])
    .sort((a, b) => a.time.localeCompare(b.time));

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
        completedDates={[]}
        onDayClick={handleDayClick}
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
                  time={workout.time}
                  exercisesCount={workout.exercisesCount}
                  muscleGroups={workout.muscleGroups}
                  date={workout.date}
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