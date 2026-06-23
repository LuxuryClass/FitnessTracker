import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/Components/UI/Button/Button';
import { PreviewCard } from '@/Components/Common/PreviewCard/PreviewCard';
import { DefaultExerciseRow } from '@/Components/Common/DefaultExerciseRow/DefaultExerciseRow';
import styles from './Styles.module.scss';
import ExerciseModal from '@/Components/Modals/ExerciseModal/ExerciseModal';
import { useAuth } from '@/Auth';
import {
  ApiError,
  authApi,
  type Exercise as CatalogExercise,
  type ExerciseMediaItem,
  type ExerciseSet,
  type Workout,
  type WorkoutExerciseCreateItem,
} from '@/Auth/authApi';
import { useAuthenticatedCall } from '@/hooks/useAuthenticatedCall';
import { useWorkoutQuery } from '@/hooks/useWorkoutQuery';
import { useExercisesQuery } from '@/hooks/useExercisesQuery';
import { labelForPrimary, labelForSecondary } from '@/Utils/muscleGroups';

// Зеркало MINUTES_PER_SET бэкенда
const MINUTES_PER_SET = 5;

interface PreviewExercise {
  exerciseId: string;
  name: string;
  muscleGroups: string[];
  targetMuscles: string[];
  equipment: string[];
  media: ExerciseMediaItem[];
  sets: ExerciseSet[];
}

const WorkoutSessionPage = () => {
  const navigate = useNavigate();
  const { workoutId } = useParams<{ workoutId: string }>();
  const { user } = useAuth();
  const callWithAuth = useAuthenticatedCall();
  const queryClient = useQueryClient();

  const { data: workout } = useWorkoutQuery(workoutId);
  const { data: catalog, isPending: isCatalogPending } = useExercisesQuery();

  const [modalExercise, setModalExercise] = useState<PreviewExercise | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const catalogById = useMemo(() => {
    const map = new Map<string, CatalogExercise>();
    for (const ex of catalog ?? []) map.set(ex.id, ex);
    return map;
  }, [catalog]);

  // Маппим, только когда загружены и тренировка, и каталог — каждое упражнение
  // тренировки гарантированно есть в каталоге.
  const exercises = useMemo<PreviewExercise[]>(() => {
    if (!workout || isCatalogPending) return [];
    return [...workout.exercises]
      .sort((a, b) => a.order_index - b.order_index)
      .flatMap(item => {
        const info = catalogById.get(item.exercise_id);
        if (!info) return [];
        return [{
          exerciseId: item.exercise_id,
          name: info.name,
          muscleGroups: info.primary_muscle_groups.map(labelForPrimary),
          targetMuscles: info.secondary_muscles.map(labelForSecondary),
          equipment: info.equipment,
          media: info.media,
          sets: item.target_sets.map(set => ({
            weight: Number(set.target_weight_kg ?? 0),
            reps: set.target_reps ?? 0,
          })),
        }];
      });
  }, [workout, isCatalogPending, catalogById]);

  const muscleGroups = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const ex of exercises) {
      for (const group of ex.muscleGroups) {
        if (!seen.has(group)) {
          seen.add(group);
          result.push(group);
        }
      }
    }
    return result;
  }, [exercises]);

  const totalTargetSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const duration = totalTargetSets > 0 ? String(totalTargetSets * MINUTES_PER_SET) : undefined;

  const handleStart = () => {
    if (!workoutId || isStarting || workout?.is_completed) return;
    setIsStarting(true);

    void (async () => {
      try {
        await callWithAuth(token => authApi.startWorkoutSession(token, workoutId));
        navigate(`/session/${workoutId}`);
      } catch (error) {
        alert(error instanceof ApiError ? error.message : 'Не удалось начать тренировку. Попробуйте позже.');
        setIsStarting(false);
      }
    })();
  };

  const handleExerciseClick = (exercise: PreviewExercise) => {
    setModalExercise(exercise);
  };

  const handleModalConfirm = (sets: ExerciseSet[], _description: string) => {
    const edited = modalExercise;
    setModalExercise(null);
    if (!workout || !workoutId || !edited) return;

    const payloadExercises: WorkoutExerciseCreateItem[] = [...workout.exercises]
      .sort((a, b) => a.order_index - b.order_index)
      .map(item => ({
        exercise_id: item.exercise_id,
        target_sets: item.exercise_id === edited.exerciseId
          ? (sets.length > 0
              ? sets.map((set, i) => ({
                  set_index: i + 1,
                  target_reps: set.reps > 0 ? set.reps : null,
                  target_weight_kg: set.weight,
                }))
              : null)
          : (item.target_sets.length > 0 ? item.target_sets : null),
      }));

    void (async () => {
      try {
        const updated = await callWithAuth(token =>
          authApi.updateWorkout(token, workoutId, { exercises: payloadExercises }),
        );
        queryClient.setQueryData<Workout>(['workout', user?.id, workoutId], updated);
      } catch (error) {
        alert(error instanceof ApiError ? error.message : 'Не удалось сохранить подходы. Попробуйте позже.');
      }
    })();
  };

  // Пока тренировка не загружена — рендерим только шапку, иначе обращения к workout.* упадут
  if (!workout) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <Button size="back" onClick={() => navigate(-1)} />
          <h1 className={styles.title}>Тренировка сегодня</h1>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <Button size="back" onClick={() => navigate(-1)} />
        <h1 className={styles.title}>Тренировка сегодня</h1>
      </div>

      <div className={styles.content}>
        {/* Preview Card */}
        <PreviewCard
        type="sessionPreview"
        title={workout.title}
        duration={duration}
        exercisesCount={exercises.length}
        muscleGroups={muscleGroups}
        description={workout.description || undefined}
        onEdit={() => console.log('Редактировать')}
        />

        {/* Exercise List */}
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Упражнения в тренировке</span>
          <div className={styles.exerciseList}>
            {exercises.map((exercise, index) => (
<DefaultExerciseRow
  key={exercise.exerciseId}
  name={exercise.name}
  muscleGroups={exercise.muscleGroups}
  targetMuscles={exercise.targetMuscles}
  sets={exercise.sets}
  index={index}
  isDragging={false}
  isOver={false}
  onDragStart={() => {}}
  onDragOver={() => {}}
  onDragEnd={() => {}}
  onClick={() => handleExerciseClick(exercise)}
  showImage={true}
  imageUrl={exercise.media.find(m => m.type === 'image')?.url}
/>
            ))}
          </div>
        </div>
      </div>

      {/* Start Button */}
      <Button
        size="l"
        color="primary"
        fullWidth
        onClick={handleStart}
        disabled={isStarting || workout.is_completed}
        className={styles.startBtn}
      >
        {workout.is_completed ? (
          'Тренировка завершена'
        ) : (
          <>
            {isStarting ? 'Запускаем...' : 'Начать'}
            <img src="/icons/StartButton.svg"/>
          </>
        )}
      </Button>

{modalExercise && (
  <ExerciseModal
    isOpen={!!modalExercise}
    onClose={() => setModalExercise(null)}
    name={modalExercise.name}
    muscleGroups={modalExercise.muscleGroups}
    targetMuscles={modalExercise.targetMuscles}
    equipment={modalExercise.equipment}
    media={modalExercise.media}
    description=""
    sets={modalExercise.sets}
    onConfirm={handleModalConfirm}
    showSaveButton={true}
  />
)}

    </div>
  );
};

export const SessionPreviewPage = WorkoutSessionPage;
