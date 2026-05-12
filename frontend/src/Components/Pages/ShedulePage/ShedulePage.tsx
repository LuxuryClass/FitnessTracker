import { useState } from 'react';
import { Button } from '@/Components/UI/Button/Button';
import { MonthCalendar } from '@/Components/Common/MonthCalendar/MonthCalendar';
// import { DayWorkoutCard } from '@/Components/Common/DayWorkoutCard/DayWorkoutCard';
import styles from './Styles.module.scss';

const SchedulePage = () => {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const plannedDates = [
    new Date(today.getFullYear(), today.getMonth(), 2),
    new Date(today.getFullYear(), today.getMonth(), 8),
    new Date(today.getFullYear(), today.getMonth(), 15),
  ];
  
  const completedDates = [
    new Date(today.getFullYear(), today.getMonth(), 1),
    new Date(today.getFullYear(), today.getMonth(), 5),
  ];

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
        year={today.getFullYear()}
        month={today.getMonth()}
        plannedDates={plannedDates}
        completedDates={completedDates}
        onDayClick={handleDayClick}
      />

      {/* {selectedDate && (
        <DayWorkoutCard
          workoutName="День жимов"
          duration="75 мин"
          exercisesCount={6}
          muscleGroups={['Грудь', 'Плечи']}
        />
      )} */}
    </div>
  );
};

export default SchedulePage;