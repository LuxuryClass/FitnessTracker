import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/Components/UI/Button/Button';
import styles from './Styles.module.scss';
import { SessionExerciseRow } from '@/Components/Common/SessionExerciseRow/SessionExerciseRow';
import { useAuth } from '@/Auth';
import {
  ApiError,
  authApi,
  Exercise,
  type Exercise as CatalogExercise,
  type ExerciseSet,
  type WorkoutSession,
} from '@/Auth/authApi';
import { useAuthenticatedCall } from '@/hooks/useAuthenticatedCall';
import { useWorkoutQuery } from '@/hooks/useWorkoutQuery';
import { useExercisesQuery } from '@/hooks/useExercisesQuery';
import { labelForPrimary } from '@/Utils/muscleGroups';
import ExerciseModal from '@/Components/Modals/ExerciseModal/ExerciseModal';

interface SessionExercise {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  sets: ExerciseSet[];
  initialDoneSets: { setIndex: number; weight: number; reps: number }[];
  completed?: boolean;
}

const SessionMainPage = () => {
  const navigate = useNavigate();
  const { workoutId } = useParams<{ workoutId: string }>();
  const { updateUser } = useAuth();
  const callWithAuth = useAuthenticatedCall();
  const queryClient = useQueryClient();

  const { data: workout } = useWorkoutQuery(workoutId);
  const { data: catalog, isPending: isCatalogPending } = useExercisesQuery();

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [completedExercises, setCompletedExercises] = useState<Record<string, boolean>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [modalExercise, setModalExercise] = useState<Exercise | null>(null);
  
  const handleExerciseImageClick = (exercise: SessionExercise) => {
    const fullExercise = catalogById.get(exercise.exerciseId);
    setModalExercise(fullExercise || null);
  };

  // id серверных записей подходов по ключу "exerciseId:setIndex" — для DELETE при удалении строки
  const serverSetIdsRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!workoutId) return;
    let cancelled = false;

    void (async () => {
      try {
        const started = await callWithAuth(token => authApi.startWorkoutSession(token, workoutId));
        if (cancelled) return;
        for (const set of started.sets) {
          serverSetIdsRef.current.set(`${set.exercise_id}:${set.set_index}`, set.id);
        }
        setSession(started);
      } catch (error) {
        if (cancelled) return;
        alert(error instanceof ApiError ? error.message : 'Не удалось начать тренировку. Попробуйте позже.');
        navigate(-1);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workoutId]);

  // Таймер от started_at сессии — переживает перезагрузку страницы
  useEffect(() => {
    if (!session) return;
    const startedAtMs = new Date(session.started_at).getTime();
    const tick = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [session]);

  const catalogById = useMemo(() => {
    const map = new Map<string, CatalogExercise>();
    for (const ex of catalog ?? []) map.set(ex.id, ex);
    return map;
  }, [catalog]);

  const doneSetsByExercise = useMemo(() => {
    const map = new Map<string, { setIndex: number; weight: number; reps: number }[]>();
    if (!session) return map;
    for (const set of session.sets) {
      const list = map.get(set.exercise_id) ?? [];
      list.push({ setIndex: set.set_index, weight: Number(set.weight_kg) || 0, reps: set.reps });
      map.set(set.exercise_id, list);
    }
    return map;
  }, [session]);

  const exercises = useMemo<SessionExercise[]>(() => {
    if (!workout || isCatalogPending || !session) return [];
    return [...workout.exercises]
      .sort((a, b) => a.order_index - b.order_index)
      .flatMap(item => {
        const info = catalogById.get(item.exercise_id);
        if (!info) return [];
        return [{
          exerciseId: item.exercise_id,
          name: info.name,
          muscleGroup: info.primary_muscle_groups.map(labelForPrimary).join(', '),
          sets: item.target_sets.map(set => ({
            weight: Number(set.target_weight_kg ?? 0),
            reps: set.target_reps ?? 0,
          })),
          initialDoneSets: doneSetsByExercise.get(item.exercise_id) ?? [],
        }];
      });
  }, [workout, isCatalogPending, catalogById, session?.id]);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const completedCount = exercises.filter(e => completedExercises[e.exerciseId]).length;
  const totalCount = exercises.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const setExerciseCompleted = (exerciseId: string, value: boolean) => {
    setCompletedExercises(prev => ({ ...prev, [exerciseId]: value }));
  };

  const handleSetComplete = (exerciseId: string, setIndex: number, weight: number, reps: number) => {
    if (!session) return;
    const sessionId = session.id;

    void (async () => {
      try {
        const saved = await callWithAuth(token =>
          authApi.upsertWorkoutSessionSet(token, sessionId, {
            exercise_id: exerciseId,
            client_event_id: crypto.randomUUID(),
            set_index: setIndex,
            weight_kg: weight,
            reps,
          }),
        );
        serverSetIdsRef.current.set(`${exerciseId}:${setIndex}`, saved.id);
      } catch (error) {
        alert(error instanceof ApiError ? error.message : 'Не удалось сохранить подход. Попробуйте позже.');
      }
    })();
  };

  // Удаление строки подхода («−»): выполненные re-upsert'ятся по новым индексам,
  // освободившийся хвостовой индекс удаляется с сервера
  const handleSetsReindexed = (
    exerciseId: string,
    doneSets: { setIndex: number; weight: number; reps: number }[],
    previousRowCount: number,
  ) => {
    if (!session) return;
    const sessionId = session.id;

    void (async () => {
      try {
        for (const done of doneSets) {
          const saved = await callWithAuth(token =>
            authApi.upsertWorkoutSessionSet(token, sessionId, {
              exercise_id: exerciseId,
              client_event_id: crypto.randomUUID(),
              set_index: done.setIndex,
              weight_kg: done.weight,
              reps: done.reps,
            }),
          );
          serverSetIdsRef.current.set(`${exerciseId}:${done.setIndex}`, saved.id);
        }

        // Хвост: запись на прежнем последнем индексе больше не нужна
        const tailKey = `${exerciseId}:${previousRowCount}`;
        const tailSetId = serverSetIdsRef.current.get(tailKey);
        if (tailSetId) {
          await callWithAuth(token => authApi.deleteWorkoutSessionSet(token, sessionId, tailSetId));
          serverSetIdsRef.current.delete(tailKey);
        }
      } catch (error) {
        alert(error instanceof ApiError ? error.message : 'Не удалось обновить подходы. Попробуйте позже.');
      }
    })();
  };

  const handleComplete = () => {
    if (!session || isCompleting) return;
    setIsCompleting(true);

    void (async () => {
      try {
        await callWithAuth(token => authApi.completeWorkoutSession(token, session.id));
        // Бэк пересчитал streak/объём — обновляем пользователя и связанные кэши
        const freshUser = await callWithAuth(token => authApi.getMe(token));
        updateUser(freshUser);
        void queryClient.invalidateQueries({ queryKey: ['nextWorkout'] });
        void queryClient.invalidateQueries({ queryKey: ['schedule'] });
        void queryClient.invalidateQueries({ queryKey: ['recentProgress'] });
        navigate('/');
      } catch (error) {
        alert(error instanceof ApiError ? error.message : 'Не удалось завершить тренировку. Попробуйте позже.');
        setIsCompleting(false);
      }
    })();
  };

  // Пока сессия и данные не загружены — рендерим только шапку
  if (!session || !workout || isCatalogPending) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>{workout?.title ?? ''}</h1>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{workout.title}</h1>
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
              key={exercise.exerciseId}
              name={exercise.name}
              muscleGroup={exercise.muscleGroup}
              sets={exercise.sets}
              index={index}
              completed={completedExercises[exercise.exerciseId]}
              initialDoneSets={exercise.initialDoneSets}
              onComplete={() => setExerciseCompleted(exercise.exerciseId, true)}
              onToggleComplete={() => setExerciseCompleted(exercise.exerciseId, false)}
              onSetComplete={(setIndex, weight, reps) => handleSetComplete(exercise.exerciseId, setIndex, weight, reps)}
              onSetsReindexed={(doneSets, previousRowCount) => handleSetsReindexed(exercise.exerciseId, doneSets, previousRowCount)}
              onImageClick={() => handleExerciseImageClick(exercise)}
            />
          ))}
        </div>
      {/* Complete Button */}
      <Button size="l" color="primary" fullWidth onClick={handleComplete} disabled={isCompleting} className={styles.completeBtn}>
        {isCompleting ? 'Завершаем...' : 'Завершить тренировку'}
      </Button>
      </div>

{modalExercise && (
  <ExerciseModal
    type="session"
    isOpen={!!modalExercise}
    onClose={() => setModalExercise(null)}
    name={modalExercise.name}
    muscleGroups={modalExercise.primary_muscle_groups}
    targetMuscles={modalExercise.secondary_muscles}
    equipment={modalExercise.equipment}
    media={modalExercise.media}
    editable={false}
  />
)}
    </div>
  );
};

export default SessionMainPage;