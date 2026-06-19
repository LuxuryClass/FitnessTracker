import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
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
  type WorkoutExerciseCreateItem,
  type Workout,
} from '@/Auth/authApi';
import { useAuthenticatedCall } from '@/hooks/useAuthenticatedCall';
import { useWorkoutQuery } from '@/hooks/useWorkoutQuery';
import { useExercisesQuery } from '@/hooks/useExercisesQuery';
import { labelForPrimary } from '@/Utils/muscleGroups';
import ExerciseModal from '@/Components/Modals/ExerciseModal/ExerciseModal';
import { ExitModal } from '@/Components/Modals/ExitModal/ExitModal';

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
  const location = useLocation();
  const { workoutId } = useParams<{ workoutId: string }>();
  const { user, updateUser } = useAuth();
  const callWithAuth = useAuthenticatedCall();
  const queryClient = useQueryClient();

  const { data: workout } = useWorkoutQuery(workoutId);
  const { data: catalog, isPending: isCatalogPending } = useExercisesQuery();

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [completedExercises, setCompletedExercises] = useState<Record<string, boolean>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [modalExercise, setModalExercise] = useState<Exercise | null>(null);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

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

  // --- обработка возврата из ExerciseSelectPage ---
  useEffect(() => {
    if (!workout || !workoutId || !session) return;
    const state = location.state as any;
    if (state?.selectedExercises) {
      const newSelected = state.selectedExercises as Record<string, string[]>;
      const allIds = new Set<string>();
      for (const ids of Object.values(newSelected)) {
        for (const id of ids) allIds.add(id);
      }
      const currentIds = new Set(workout.exercises.map(e => e.exercise_id));
      const newIds = [...allIds].filter(id => !currentIds.has(id));
      if (newIds.length === 0) {
        navigate(location.pathname, { replace: true, state: {} });
        return;
      }
      const existingExercises = workout.exercises.map(item => ({
        exercise_id: item.exercise_id,
        target_sets: item.target_sets.length > 0 ? item.target_sets : null,
      }));
      const newExercises: WorkoutExerciseCreateItem[] = newIds.map(id => ({
        exercise_id: id,
        target_sets: null,
      }));
      const payloadExercises = [...existingExercises, ...newExercises];

      setIsUpdating(true);
      void (async () => {
        try {
          const updated = await callWithAuth(token =>
            authApi.updateWorkout(token, workoutId, { exercises: payloadExercises })
          );
          queryClient.setQueryData<Workout>(['workout', user?.id, workoutId], updated);
          navigate(location.pathname, { replace: true, state: {} });
        } catch (error) {
          alert(error instanceof ApiError ? error.message : 'Не удалось добавить упражнения.');
        } finally {
          setIsUpdating(false);
        }
      })();
    }
  }, [location.state, workout, workoutId, session, callWithAuth, queryClient, user, navigate]);

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
  }, [workout, isCatalogPending, catalogById, session]);

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

  // --- добавление упражнения ---
  const handleAddExercise = () => {
    if (!workout) return;
    const currentSelected: Record<string, string[]> = {};
    const ids = workout.exercises.map(e => e.exercise_id);
    navigate('/exercises/myself', {
      state: {
        currentSelectedExercises: { myself: ids },
        currentExerciseSets: {},
        currentFormSettings: {},
        exerciseSearchQuery: '',
        // флаг, что мы в режиме сессии, чтобы при возврате обновить тренировку
        isSessionMode: true,
        sessionWorkoutId: workoutId,
      }
    });
  };

  // --- выход ---
  const handleExit = () => {
    setIsExitModalOpen(true);
  };

  const handleExitWithoutSave = () => {
    setIsExitModalOpen(false);
    navigate('/');
  };

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
        <div className={styles.headerActions}>
          <button className={styles.actionButton} onClick={handleAddExercise} disabled={isUpdating}>
            <img src="/icons/AddExercise.svg" alt="Добавить упражнение" />
          </button>
          <button className={styles.actionButton} onClick={handleExit}>
            <img src="/icons/Exit.svg" alt="Выйти" />
          </button>
        </div>
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
              onImageClick={() => setModalExercise(catalogById.get(exercise.exerciseId) ?? null)}
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
          targetMuscles={modalExercise.primary_muscle_groups}
          muscleGroups={modalExercise.secondary_muscles}
          equipment={modalExercise.equipment}
          media={modalExercise.media}
        />
      )}

      <ExitModal
        isOpen={isExitModalOpen}
        onClose={() => setIsExitModalOpen(false)}
        onFinish={handleComplete}
        onExit={handleExitWithoutSave}
        isFinishing={isCompleting}
      />
    </div>
  );
};

export default SessionMainPage;