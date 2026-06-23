import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/Components/UI/Button/Button';
import { PreviewCard } from '@/Components/Common/PreviewCard/PreviewCard';
import { DefaultExerciseRow } from '@/Components/Common/DefaultExerciseRow/DefaultExerciseRow';
import { SessionResultRow } from '@/Components/Common/SessionResultRow/SessionResultRow';
import styles from './Styles.module.scss';
import ExerciseModal from '@/Components/Modals/ExerciseModal/ExerciseModal';
import { DeleteWorkoutModal } from '@/Components/Modals/DeleteWorkoutModal/DeleteWorkoutModal';
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
import { useCompletedSessionQuery } from '@/hooks/useCompletedSessionQuery';
import { useDeleteWorkoutMutation } from '@/hooks/useDeleteWorkoutMutation';
import { labelForPrimary, labelForSecondary } from '@/Utils/muscleGroups';
import { PRIMARY_TO_SECONDARY } from '@/Utils/muscleGroups';
import MuscleAccentComponent from '@/Components/Common/MuscleAccentComponent/MuscleAccentComponent';

// Зеркало MINUTES_PER_SET бэкенда
const MINUTES_PER_SET = 5;

interface PreviewExercise {
  exerciseId: string;
  name: string;
  description: string | null;
  muscleGroups: string[];
  targetMuscles: string[];
  equipment: string[];
  media: ExerciseMediaItem[];
  sets: ExerciseSet[];
  // Фактически выполненные подходы (только для завершённой тренировки).
  actualSets: ExerciseSet[];
}

const WorkoutSessionPage = () => {
  const navigate = useNavigate();
  const { workoutId } = useParams<{ workoutId: string }>();
  const { user } = useAuth();
  const callWithAuth = useAuthenticatedCall();
  const queryClient = useQueryClient();

  const { data: workout } = useWorkoutQuery(workoutId);
  const { data: catalog, isPending: isCatalogPending } = useExercisesQuery();

  const isCompleted = workout?.is_completed ?? false;
  const { data: completedSession } = useCompletedSessionQuery(workoutId, isCompleted);

  const [modalExercise, setModalExercise] = useState<PreviewExercise | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const deleteMutation = useDeleteWorkoutMutation();

  const [items, setItems] = useState<PreviewExercise[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const catalogById = useMemo(() => {
    const map = new Map<string, CatalogExercise>();
    for (const ex of catalog ?? []) map.set(ex.id, ex);
    return map;
  }, [catalog]);

  const actualSetsByExercise = useMemo(() => {
    const map = new Map<string, ExerciseSet[]>();
    for (const set of completedSession?.sets ?? []) {
      const list = map.get(set.exercise_id) ?? [];
      list.push({ weight: Number(set.weight_kg), reps: set.reps });
      map.set(set.exercise_id, list);
    }
    return map;
  }, [completedSession]);

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
          description: info.description,
          muscleGroups: info.primary_muscle_groups.map(labelForPrimary),
          targetMuscles: info.secondary_muscles.map(labelForSecondary),
          equipment: info.equipment,
          media: info.media,
          sets: item.target_sets.map(set => ({
            weight: Number(set.target_weight_kg ?? 0),
            reps: set.target_reps ?? 0,
          })),
          actualSets: actualSetsByExercise.get(item.exercise_id) ?? [],
        }];
      });
  }, [workout, isCatalogPending, catalogById, actualSetsByExercise]);

  useEffect(() => {
    setItems(exercises);
  }, [exercises]);

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

  const muscleFocusData = useMemo(() => {
  if (!exercises.length) return [];
  const counts = new Map<string, number>();
  for (const ex of exercises) {
    // ex.muscleGroups — это уже русские названия (labelForPrimary)
    // нам нужны слаги для PRIMARY_TO_SECONDARY, которых нет в PreviewExercise
    // используем catalogById для получения слагов
    const info = catalogById.get(ex.exerciseId);
    if (!info) continue;
    
    const secondary = new Set(info.secondary_muscles);
    const slugs = new Set<string>();
    const claimed = new Set<string>();
    for (const g of info.primary_muscle_groups) {
      const groupSlugs = PRIMARY_TO_SECONDARY[g] ?? [];
      const groupSecondary = groupSlugs.filter((s) => secondary.has(s));
      if (groupSecondary.length > 0) {
        for (const s of groupSecondary) { slugs.add(s); claimed.add(s); }
      } else {
        for (const s of groupSlugs) slugs.add(s);
      }
    }
    for (const s of secondary) if (!claimed.has(s)) slugs.add(s);
    for (const slug of slugs) counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  return Array.from(counts, ([muscle, intensity]) => ({ muscle, intensity }));
}, [exercises, catalogById]);

  const formatHeaderTitle = (): string => {
  if (!workout) return 'Тренировка сегодня';

  if (isCompleted && completedSession?.completed_at) {
    const completedDate = new Date(completedSession.completed_at);
    const today = new Date();
    const diffDays = Math.round((today.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const dd = String(completedDate.getDate()).padStart(2, '0');
    const mm = String(completedDate.getMonth() + 1).padStart(2, '0');
    const dateStr = `${dd}.${mm}`;
    
    if (diffDays === 0) return `Тренировка ${dateStr} · сегодня`;
    if (diffDays === 1) return `Тренировка ${dateStr} · вчера`;
    return `Тренировка ${dateStr}`;
  }

  if (workout.planned_for) {
    const planned = new Date(workout.planned_for);
    const today = new Date();
    const diffDays = Math.round((planned.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    const dd = String(planned.getDate()).padStart(2, '0');
    const mm = String(planned.getMonth() + 1).padStart(2, '0');
    const dateStr = `${dd}.${mm}`;
    
    if (diffDays === 0) return 'Тренировка сегодня';
    if (diffDays === 1) return 'Тренировка завтра';
    if (diffDays === -1) return 'Тренировка вчера';
    return `Тренировка ${dateStr}`;
  }

  return 'Тренировка сегодня';
};

  const totalTargetSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const duration = totalTargetSets > 0 ? String(totalTargetSets * MINUTES_PER_SET) : undefined;

  const formatDuration = (min: number | null): string => {
    if (min === null) return '—';
    if (min < 60) return `${min} мин`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h} ч ${m} мин` : `${h} ч`;
  };

  const completedTime = useMemo(() => {
    if (!isCompleted || !completedSession?.completed_at) return undefined;
    const diffMs = new Date(completedSession.completed_at).getTime() - new Date(completedSession.started_at).getTime();
    const durationMin = diffMs > 0 ? Math.round(diffMs / 60000) : 0;
    return formatDuration(durationMin);
  }, [isCompleted, completedSession]);

  const handleDragStart = (index: number) => {
  setDragIndex(index);
};

const handleDragOver = (e: React.DragEvent, index: number) => {
  e.preventDefault();
  setOverIndex(index);
};

const handleDragEnd = () => {
  if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
    const newItems = [...items];
    const [removed] = newItems.splice(dragIndex, 1);
    newItems.splice(overIndex, 0, removed);
    setItems(newItems);
    
    const payloadExercises = newItems.map((ex, _) => {
      const original = workout?.exercises.find(we => we.exercise_id === ex.exerciseId);
      return {
        exercise_id: ex.exerciseId,
        target_sets: original?.target_sets ?? [],
      };
    });

    callWithAuth(token => authApi.updateWorkout(token, workoutId!, { exercises: payloadExercises }))
      .then(updated => {
        queryClient.setQueryData(['workout', user?.id, workoutId], updated);
      })
      .catch(err => {
        alert(err instanceof ApiError ? err.message : 'Не удалось изменить порядок');
      });
  }
  setDragIndex(null);
  setOverIndex(null);
};

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

  const handleDelete = (scope: 'this' | 'following') => {
    if (!workoutId || deleteMutation.isPending) return;

    void (async () => {
      try {
        await deleteMutation.mutateAsync({ workoutId, scope });
        setIsDeleteOpen(false);
        navigate('/');
      } catch (error) {
        alert(error instanceof ApiError ? error.message : 'Не удалось удалить тренировку. Попробуйте позже.');
      }
    })();
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

  const handleAddExercise = () => {
    if (!workoutId) return;
    navigate(`/workout/${workoutId}/add`, { state: { returnTo: 'preview' } });
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <Button size="back" onClick={() => navigate("/home")} />
<h1 className={styles.title}>{isCompleted ? 'Итоги тренировки' : formatHeaderTitle()}</h1>        {!isCompleted && (
          <button className={styles.deleteBtn} onClick={() => setIsDeleteOpen(true)} aria-label="Удалить тренировку">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M3 6H21M8 6V4A2 2 0 0 1 10 2H14A2 2 0 0 1 16 4V6M19 6V20A2 2 0 0 1 17 22H7A2 2 0 0 1 5 20V6M10 11V17M14 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>

      <div className={styles.content}>
        {/* Preview Card */}
        <PreviewCard
        type="sessionPreview"
        title={workout.title}
        duration={duration}
        completedTime={completedTime}
        exercisesCount={exercises.length}
        muscleGroups={muscleGroups}
        description={workout.description || undefined}
        />

        <div className={styles.section}>
          <span className={styles.sectionLabel}>
            {isCompleted ? 'Что выполнено' : 'Упражнения в тренировке'}
          </span>
          <div className={styles.exerciseList}>
            {items.map((exercise, index) =>
              isCompleted ? (
                <SessionResultRow
                  key={exercise.exerciseId}
                  name={exercise.name}
                  muscleGroup={exercise.muscleGroups[0]}
                  sets={exercise.actualSets}
                  imageUrl={exercise.media.find(m => m.type === 'image')?.url}
                  onImageClick={() => handleExerciseClick(exercise)}
                />
              ) : (
    <DefaultExerciseRow
      key={exercise.exerciseId}
      showDrag={true}
      isDragging={dragIndex === index}
      isOver={overIndex === index}
      onDragStart={() => handleDragStart(index)}
      onDragOver={(e) => handleDragOver(e, index)}
      onDragEnd={handleDragEnd}
      name={exercise.name}
      muscleGroups={exercise.muscleGroups}
      targetMuscles={exercise.targetMuscles}
      sets={exercise.sets}
      index={index}
      showImage={true}
      imageUrl={exercise.media.find(m => m.type === 'image')?.url}
      onClick={() => handleExerciseClick(exercise)}
    />
              ),
            )}
            {!isCompleted && (
              <button className={styles.addExerciseBtn} onClick={handleAddExercise}>
                + Добавить упражнения
              </button>
            )}
          </div>

          {muscleFocusData.length > 0 && (
  <div className={styles.accentSection}>
    <h3 className={styles.accentSection_title}>Акцент на мышцы</h3>
    <MuscleAccentComponent
      gender={user?.gender ?? "male"}
      data={muscleFocusData}
    />
  </div>
)}
        </div>
      </div>

      {!isCompleted && (
        <Button
          size="l"
          color="primary"
          fullWidth
          onClick={handleStart}
          disabled={isStarting}
          className={styles.startBtn}
        >
          {isStarting ? 'Запускаем...' : 'Начать'}
          <img src="/icons/StartButton.svg"/>
        </Button>
      )}

{modalExercise && (
  <ExerciseModal
    isOpen={!!modalExercise}
    onClose={() => setModalExercise(null)}
    name={modalExercise.name}
    muscleGroups={modalExercise.muscleGroups}
    targetMuscles={modalExercise.targetMuscles}
    equipment={modalExercise.equipment}
    media={modalExercise.media}
    description={modalExercise.description ?? ''}
    sets={modalExercise.sets}
    onConfirm={handleModalConfirm}
    showSaveButton={true}
  />
)}

    <DeleteWorkoutModal
      isOpen={isDeleteOpen}
      isRepeating={!!workout.series_id}
      isDeleting={deleteMutation.isPending}
      onClose={() => setIsDeleteOpen(false)}
      onConfirm={handleDelete}
    />

    </div>
  );
};

export const SessionPreviewPage = WorkoutSessionPage;
