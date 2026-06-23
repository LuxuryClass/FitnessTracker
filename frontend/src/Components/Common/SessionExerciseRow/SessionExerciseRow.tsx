import { memo, useState, useRef, useEffect } from 'react';
import styles from './Styles.module.scss';
import cn from 'classnames';

interface SetData {
  weight: number;
  reps: number;
}

// Выполненный подход, восстановленный с сервера (set_index — 1-based)
interface DoneSet {
  setIndex: number;
  weight: number;
  reps: number;
}

interface SessionExerciseRowProps {
  name: string;
  muscleGroup: string;
  sets?: SetData[];
  index: number;
  completed?: boolean;
  initialDoneSets?: DoneSet[];
  imageUrl?: string;
  onComplete?: () => void;
  onImageClick?: () => void;
  onToggleComplete?: () => void;
  onSetComplete?: (setIndex: number, weight: number, reps: number) => void;
  onSetsReindexed?: (doneSets: DoneSet[], previousRowCount: number) => void;
  isFocused?: boolean;
}

const SessionExerciseRowComponent = ({
  name,
  muscleGroup,
  sets = [],
  completed,
  initialDoneSets = [],
  imageUrl,
  onComplete,
  onImageClick,
  onToggleComplete,
  onSetComplete,
  onSetsReindexed,
  isFocused,
}: SessionExerciseRowProps) => {
  // Начальное состояние строк: план + восстановленные с сервера выполненные подходы
  const buildInitialRows = () => {
    const doneByIndex = new Map(initialDoneSets.map(d => [d.setIndex, d]));
    const rowCount = Math.max(sets.length, ...initialDoneSets.map(d => d.setIndex), 0);
    const values = Array.from({ length: rowCount }, (_, i) => {
      const done = doneByIndex.get(i + 1);
      return done ? { weight: String(done.weight), reps: String(done.reps) } : { weight: '', reps: '' };
    });
    const doneFlags = Array.from({ length: rowCount }, (_, i) => doneByIndex.has(i + 1));
    return { values, doneFlags };
  };

  const [expanded, setExpanded] = useState(false);
  const [currentSetIndex, setCurrentSetIndex] = useState(() => {
    const idx = buildInitialRows().doneFlags.findIndex(done => !done);
    return idx >= 0 ? idx : 0;
  });
  const [setValues, setSetValues] = useState<{ weight: string; reps: string }[]>(
    () => buildInitialRows().values
  );
  const [completedSets, setCompletedSets] = useState<boolean[]>(() => buildInitialRows().doneFlags);
  
  const [restTimer, setRestTimer] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
const [showReset, setShowReset] = useState(false);

const handleStart = () => {
  startRest();
  setShowReset(true);
};

const handleReset = () => {
  setIsResting(false);
  setIsPaused(false);
  setRestTimer(0);
  setShowReset(false);
  if (restIntervalRef.current) clearInterval(restIntervalRef.current);
};

  useEffect(() => {
  if (isResting && !isPaused) {
    restIntervalRef.current = setInterval(() => setRestTimer(prev => prev + 1), 1000);
  }
  return () => { if (restIntervalRef.current) clearInterval(restIntervalRef.current); };
}, [isResting, isPaused]);

const startRest = () => {
  setIsResting(true);
  setIsPaused(false);
  setRestTimer(0);
};

const pauseRest = () => {
  setIsPaused(true);
  if (restIntervalRef.current) clearInterval(restIntervalRef.current);
};

const resumeRest = () => {
  setIsPaused(false);
};



  const allSetsCompleted = completedSets.length > 0 && completedSets.every(Boolean);
  const [localCompleted, setLocalCompleted] = useState(completed);

  // Поиск первого невыполненного подхода
  const findFirstIncomplete = () => {
    const idx = completedSets.findIndex(done => !done);
    return idx >= 0 ? idx : 0;
  };

  useEffect(() => {
    setLocalCompleted(completed);
  }, [completed]);

  useEffect(() => {
    if (allSetsCompleted && !localCompleted) {
      setLocalCompleted(true);
      onComplete?.();
    } else if (!allSetsCompleted && localCompleted) {
      setLocalCompleted(false);
      onToggleComplete?.();
    }
  }, [allSetsCompleted]);

  useEffect(() => {
    if (isFocused && !expanded) {
      setExpanded(true);
    }
  }, [isFocused]);

  const formatRest = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const getPlaceholder = (i: number, field: 'weight' | 'reps'): string => {
    return String(sets[i]?.[field] ?? '0');
  };

  const updateSetValue = (i: number, field: 'weight' | 'reps', value: string) => {
    setSetValues(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  };

  const toggleSetDone = (i: number) => {
    if (!completedSets[i]) {
      const weight = Number(setValues[i]?.weight || getPlaceholder(i, 'weight')) || 0;
      const reps = Number(setValues[i]?.reps || getPlaceholder(i, 'reps')) || 0;
      if (reps < 1) return;

      setSetValues(vals => vals.map((s, idx) => {
        if (idx !== i) return s;
        return {
          weight: s.weight || getPlaceholder(i, 'weight'),
          reps: s.reps || getPlaceholder(i, 'reps'),
        };
      }));
      onSetComplete?.(i + 1, weight, reps);
    }
    setCompletedSets(prev => {
      const next = [...prev];
      next[i] = !next[i];
      setCurrentSetIndex(findFirstIncomplete());
      return next;
    });
  };

  const handleSetClick = (i: number) => {
    if (!completedSets[i]) {
      setCurrentSetIndex(i);
    }
  };

  const addSet = () => {
    const lastIndex = setValues.length - 1;
    const newIndex = lastIndex + 1;

    const lastUserWeight = setValues[lastIndex]?.weight || '';
    const lastUserReps = setValues[lastIndex]?.reps || '';

    const planWeight = sets[newIndex]?.weight !== undefined ? String(sets[newIndex].weight) : '';
    const planReps = sets[newIndex]?.reps !== undefined ? String(sets[newIndex].reps) : '';

    const newWeight = planWeight || lastUserWeight || '0';
    const newReps = planReps || lastUserReps || '1';

    setSetValues(prev => [...prev, { weight: newWeight, reps: newReps }]);
    setCompletedSets(prev => [...prev, false]);
  };

  const [removingIndex, setRemovingIndex] = useState<number | null>(null);

    const removeSet = (i: number) => {
    setRemovingIndex(i);
    setTimeout(() => {
        const previousRowCount = setValues.length;
        const nextValues = setValues.filter((_, idx) => idx !== i);
        const nextDone = completedSets.filter((_, idx) => idx !== i);
        const doneSets = nextValues
          .map((value, idx) => ({
            setIndex: idx + 1,
            weight: Number(value.weight) || 0,
            reps: Number(value.reps) || 0,
          }))
          .filter((_, idx) => nextDone[idx]);

        setSetValues(nextValues);
        setCompletedSets(nextDone);
        setRemovingIndex(null);
        if (currentSetIndex >= i && currentSetIndex > 0) {
        setCurrentSetIndex(prev => prev - 1);
        }
        onSetsReindexed?.(doneSets, previousRowCount);
    }, 300);
    };

  return (
    <div className={cn(
      styles.card,
      expanded && styles.card_expanded,
      localCompleted && styles.card_completed
    )}>
      <div className={styles.header} onClick={() => setExpanded(!expanded)}>
        <div className={styles.image} onClick={e => { e.stopPropagation(); onImageClick?.(); }}>
          {imageUrl ? (
            <img src={imageUrl} alt={name} />
          ) : null}
        </div>
        <div className={styles.headerInfo}>
          <span className={styles.name}>{name}</span>
          <span className={styles.muscle}>{muscleGroup}</span>
        </div>
        <svg className={cn(styles.chevron, expanded && styles.chevron_open)} width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {expanded && (
        <div className={styles.body}>
          {setValues.map((set, i) => (
<div key={i} className={cn(
  styles.setRow,
  completedSets[i] && styles.setRow_done,
  i === currentSetIndex && !completedSets[i] && !isResting && styles.setRow_current,
  removingIndex === i && styles.setRow_removing
)} onClick={() => handleSetClick(i)}>
              <span className={styles.setIndex}>{i + 1}</span>

              <div className={styles.inputsGroup}>
                <div className={styles.weightGroup}>
                  <input type="number" className={styles.setInput}
                    placeholder={getPlaceholder(i, 'weight')}
                    value={set.weight}
                    onChange={e => updateSetValue(i, 'weight', e.target.value)}
                    onClick={e => e.stopPropagation()}
                    style={{ width: `${Math.max(set.weight.length, getPlaceholder(i, 'weight').length, 1)}ch` }}
                  />
                  <span className={styles.unit}>кг</span>
                </div>

                <span className={styles.multiply}>×</span>

                <input type="number" className={styles.setInput}
                  placeholder={getPlaceholder(i, 'reps')}
                  value={set.reps}
                  onChange={e => updateSetValue(i, 'reps', e.target.value)}
                  onClick={e => e.stopPropagation()}
                  style={{ width: `${Math.max(set.reps.length, getPlaceholder(i, 'reps').length, 1)}ch` }}
                />
              </div>

              <div className={styles.buttons}>
                <button className={styles.removeBtn} onClick={e => { e.stopPropagation(); removeSet(i); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                </button>

                <button className={cn(styles.checkBtn, completedSets[i] && styles.checkBtn_done)} onClick={e => { e.stopPropagation(); toggleSetDone(i); }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>              
              </div>
            </div>
          ))}

          <button className={styles.addSetBtn} onClick={addSet}>+ Добавить подход</button>

<div className={cn(styles.restTimer, isResting && styles.restTimer_active)}>
  <span className={styles.restLabel}>Отдых</span>
  <span className={styles.restValue}>{formatRest(restTimer)}</span>
  
  <div className={styles.restControls}>
    {!isResting && (
      <button className={styles.restBtn} onClick={handleStart}>Старт</button>
    )}
    {isResting && (
      <>
        <button 
          className={cn(styles.restBtn, styles.restBtn_reset, showReset && styles.restBtn_show)} 
          onClick={handleReset}
        >
          Очистить
        </button>
        <button 
          className={cn(styles.restBtn, isPaused ? styles.restBtn_primary : styles.restBtn_stop)} 
          onClick={isPaused ? resumeRest : pauseRest}
        >
          {isPaused ? 'Продолжить' : 'Стоп'}
        </button>
      </>
    )}
  </div>
</div>
        </div>
      )}
    </div>
  );
};

export const SessionExerciseRow = memo(SessionExerciseRowComponent);