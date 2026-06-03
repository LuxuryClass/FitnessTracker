import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/Components/UI/Button/Button';
import { PreviewCard } from '@/Components/Common/PreviewCard/PreviewCard';
import { ExerciseRow } from '@/Components/Common/ExerciseRow/ExerciseRow';
import styles from './Styles.module.scss';
import ExerciseModal from '@/Components/Modals/ExerciseModal/ExerciseModal';

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  sets?: { weight: number; reps: number }[];
}

const WorkoutSessionPage = () => {
  const navigate = useNavigate();
  const { workoutId } = useParams<{ workoutId: string }>();

  const [notes, setNotes] = useState('');
  const [modalExercise, setModalExercise] = useState<Exercise | null>(null);

  // Моковые данные
  const workout = {
    title: 'День жимов',
    date: '2026-06-01',
    time: '19:30',
    duration: '75',
    totalWeight: '120',
    exercisesCount: 5,
    muscleGroups: ['Грудь', 'Плечи', 'Трицепс'],
    exercises: [
      { id: '1', name: 'Жим лёжа', muscleGroup: 'Грудь', sets: [{ weight: 80, reps: 10 }, { weight: 90, reps: 8 }] },
      { id: '2', name: 'Жим гантелей', muscleGroup: 'Грудь', sets: [{ weight: 30, reps: 12 }] },
      { id: '3', name: 'Махи гантелями', muscleGroup: 'Плечи', sets: [{ weight: 12, reps: 15 }] },
      { id: '4', name: 'Разгибания на блоке', muscleGroup: 'Трицепс', sets: [{ weight: 25, reps: 12 }] },
      { id: '5', name: 'Отжимания от брусьев', muscleGroup: 'Грудь', sets: [{ weight: 0, reps: 15 }] },
    ],
    description: "здесь могла быть ваша реклама",
  };

    const handleStart = () => {
    navigate(`/session/${workoutId || 'test'}`);
    };

  const handleExerciseClick = (exercise: Exercise) => {
    setModalExercise(exercise);
  };

  const handleModalConfirm = (sets: { weight: number; reps: number }[], description: string) => {
    console.log('Сохранено:', { sets, description, exercise: modalExercise });
    setModalExercise(null);
  };


  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <Button size="back" />
        <h1 className={styles.title}>Тренировка сегодня</h1>
      </div>

      <div className={styles.content}>
        {/* Preview Card */}
        <PreviewCard
        type="sessionPreview"
        title={workout.title}
        duration={workout.duration}
        totalWeight={workout.totalWeight}
        exercisesCount={workout.exercisesCount}
        date={workout.date}
        time={workout.time}
        muscleGroups={workout.muscleGroups}
        description={workout.description || undefined}
        onEdit={() => console.log('Редактировать')}
        />

        {/* Notes */}
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Заметки к тренировке</span>
          <textarea
            className={styles.textarea}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Добавьте заметки к этой тренировке..."
            rows={3}
          />
        </div>

        {/* Exercise List */}
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Упражнения в тренировке</span>
          <div className={styles.exerciseList}>
            {workout.exercises.map((exercise, index) => (
            <ExerciseRow
            key={exercise.id}
            name={exercise.name}
            muscleGroups={[exercise.muscleGroup]}
            targetMuscles={[]}
            sets={exercise.sets}
            index={index}
            isDragging={false}
            isOver={false}
            onDragStart={() => {}}
            onDragOver={() => {}}
            onDragEnd={() => {}}
            onClick={() => handleExerciseClick(exercise)}
            />
            ))}
          </div>
        </div>
      </div>

      {/* Start Button */}
      <Button size="l" color="primary" fullWidth onClick={handleStart} className={styles.startBtn}>
        Начать
        <img src="/public/icons/StartButton.svg"/>
      </Button>

      {modalExercise && (
        <ExerciseModal
          isOpen={!!modalExercise}
          onClose={() => setModalExercise(null)}
          name={modalExercise.name}
          muscleGroups={[modalExercise.muscleGroup]}
          equipment={[]}
          description=""
          sets={modalExercise.sets}
          onConfirm={handleModalConfirm}
        />
      )}

    </div>
  );
};

export const SessionPreviewPage = WorkoutSessionPage;