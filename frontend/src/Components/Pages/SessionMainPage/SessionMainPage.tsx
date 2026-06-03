import { useState, useEffect } from 'react';
import { useNavigate, /* useParams */ } from 'react-router-dom';
import { Button } from '@/Components/UI/Button/Button';
import styles from './Styles.module.scss';
import { SessionExerciseRow } from '@/Components/Common/SessionExerciseRow/SessionExerciseRow';

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  sets?: { weight: number; reps: number }[];
  completed?: boolean;
}

const SessionMainPage = () => {
  const navigate = useNavigate();
  // const { workoutId } = useParams<{ workoutId: string }>();

  const [exercises, setExercises] = useState<Exercise[]>([
    { id: '1', name: 'Жим лёжа', muscleGroup: 'Грудь', sets: [{ weight: 80, reps: 10 }, { weight: 90, reps: 8 }] },
    { id: '2', name: 'Жим гантелей', muscleGroup: 'Грудь', sets: [{ weight: 30, reps: 12 }] },
    { id: '3', name: 'Махи гантелями', muscleGroup: 'Плечи', sets: [{ weight: 12, reps: 15 }] },
    { id: '4', name: 'Разгибания на блоке', muscleGroup: 'Трицепс', sets: [{ weight: 25, reps: 12 }] },
    { id: '5', name: 'Отжимания от брусьев', muscleGroup: 'Грудь', sets: [{ weight: 0, reps: 15 }] },
  ]);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(true);

  // Таймер
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const completedCount = exercises.filter(e => e.completed).length;
  const totalCount = exercises.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const toggleExercise = (id: string) => {
    setExercises(prev => prev.map(e => e.id === id ? { ...e, completed: !e.completed } : e));
  };

  const handleComplete = () => {
    setIsRunning(false);
    console.log('Тренировка завершена', { time: formatTime(elapsedSeconds), exercises });
    navigate(-1);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>День жимов</h1>
      </div>  

      {/* Timer + Progress */}
     <div className={styles.stats}>
      <div className={styles.timer}>
        <div className={styles.timerRow}>
          <img src="/icons/Timer_Primary.svg" />
          <span className={styles.timerValue}>{formatTime(elapsedSeconds)}</span>
        </div>
        <span className={styles.timerLabel}>Время тренировки</span>
      </div>

      <div className={styles.progress}>
        <span className={styles.progressCounter}>{completedCount}/{totalCount}</span>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
        </div>
      </div>
     </div>

      {/* Exercise List */}
      <div className={styles.content}>
        <div className={styles.exerciseList}>
          {exercises.map((exercise, index) => (
            <SessionExerciseRow
              name={exercise.name}
              muscleGroup={exercise.muscleGroup}
              sets={exercise.sets}
              index={index}
              completed={exercise.completed}
              onComplete={() => toggleExercise(exercise.id)}
              onImageClick={() => {}}
            />
          ))}
        </div>
      {/* Complete Button */}
      <Button size="l" color="primary" fullWidth onClick={handleComplete} className={styles.completeBtn}>
        Завершить тренировку
      </Button>
      </div>

    </div>
  );
};

export default SessionMainPage;