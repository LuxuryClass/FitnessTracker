import { memo, useState, useRef, useEffect} from 'react';
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
  isCardio?: boolean;
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
  isCardio = false,
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

  // Таймер (отдых или кардио-подход)
  const [timerValue, setTimerValue] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Режим таймера: 'rest' | 'cardio'
  const [timerMode, setTimerMode] = useState<'rest' | 'cardio'>('rest');
  // Индекс подхода, для которого запущен кардио-таймер
  const [cardioSetIndex, setCardioSetIndex] = useState<number | null>(null);
  // Целевое время для обратного отсчёта (сек)
  const [cardioTarget, setCardioTarget] = useState(0);

  const allSetsCompleted = completedSets.length > 0 && completedSets.every(Boolean);
  const [localCompleted, setLocalCompleted] = useState(completed);

  // Поиск первого невыполненного подхода
  // const findFirstIncomplete = useCallback(() => {
  //   const idx = completedSets.findIndex(done => !done);
  //   return idx >= 0 ? idx : 0;
  // }, [completedSets]);

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

  // Интервал таймера
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimerValue(prev => {
          const next = prev + 1;
          // Кардио: обратный отсчёт
          if (timerMode === 'cardio' && next >= cardioTarget) {
            // Время истекло — автозавершение подхода
            setIsTimerRunning(false);
            setTimerMode('rest');
            setCardioSetIndex(null);
            if (cardioSetIndex !== null) {
              autoCompleteCardioSet(cardioSetIndex);
            }
            return cardioTarget;
          }
          return next;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isTimerRunning, timerMode, cardioTarget, cardioSetIndex]);

  useEffect(() => {
    if (!isTimerRunning && !isTimerPaused) {
      setTimerValue(0);
    }
  }, [isTimerRunning, isTimerPaused]);

  // Автозавершение кардио-подхода по истечении таймера
const autoCompleteCardioSet = (i: number) => {
  const weight = Number(setValues[i]?.weight || getPlaceholder(i, 'weight')) || 0;
  const reps = cardioTarget;

  setSetValues(vals => vals.map((s, idx) => {
    if (idx !== i) return s;
    return {
      weight: s.weight || getPlaceholder(i, 'weight'),
      reps: String(reps),
    };
  }));
  onSetComplete?.(i + 1, weight, reps);

  // Сброс таймера
  setIsTimerRunning(false);
  setIsTimerPaused(false);
  setTimerValue(0);
  setTimerMode('rest');
  setCardioSetIndex(null);

  setCompletedSets(prev => {
    const next = [...prev];
    next[i] = true;
    // Ищем первый невыполненный в уже обновлённом next
    const firstIncomplete = next.findIndex(done => !done);
    if (firstIncomplete >= 0) {
      setCurrentSetIndex(firstIncomplete);
    }
    return next;
  });
};

const handleManualComplete = (i: number) => {
  if (isCardio && cardioSetIndex === i && isTimerActive) {
    setIsTimerRunning(false);
    setIsTimerPaused(false);
    setTimerValue(0);
    setTimerMode('rest');
    setCardioSetIndex(null);
    if (timerRef.current) clearInterval(timerRef.current);
  }
  
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
    
    setCompletedSets(prev => {
      const next = [...prev];
      next[i] = true;
      const firstIncomplete = next.findIndex(done => !done);
      if (firstIncomplete >= 0) {
        setCurrentSetIndex(firstIncomplete);
      }
      return next;
    });
  } else {
    onToggleComplete?.();
    setCompletedSets(prev => {
      const next = [...prev];
      next[i] = false;
      const firstIncomplete = next.findIndex(done => !done);
      if (firstIncomplete >= 0) {
        setCurrentSetIndex(firstIncomplete);
      }
      return next;
    });
  }
};

  const formatTime = (s: number) => {
    const display = timerMode === 'cardio' ? Math.max(0, cardioTarget - s) : s;
    return `${String(Math.floor(display / 60)).padStart(2, '0')}:${String(display % 60).padStart(2, '0')}`;
  };

  const getPlaceholder = (i: number, field: 'weight' | 'reps'): string => {
    if (isCardio && field === 'reps') {
      return String(sets[i]?.[field] ?? '60');
    }
    return String(sets[i]?.[field] ?? '0');
  };

  const updateSetValue = (i: number, field: 'weight' | 'reps', value: string) => {
    setSetValues(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  };

  // const toggleSetDone = (i: number) => {
  //   if (!completedSets[i]) {
  //     const weight = Number(setValues[i]?.weight || getPlaceholder(i, 'weight')) || 0;
  //     const reps = Number(setValues[i]?.reps || getPlaceholder(i, 'reps')) || 0;
  //     if (reps < 1) return;

  //     setSetValues(vals => vals.map((s, idx) => {
  //       if (idx !== i) return s;
  //       return {
  //         weight: s.weight || getPlaceholder(i, 'weight'),
  //         reps: s.reps || getPlaceholder(i, 'reps'),
  //       };
  //     }));
  //     onSetComplete?.(i + 1, weight, reps);
  //   } else {
  //     onToggleComplete?.();
  //   }
  //   setCompletedSets(prev => {
  //     const next = [...prev];
  //     next[i] = !next[i];
  //     setCurrentSetIndex(findFirstIncomplete());
  //     return next;
  //   });
  // };

  const handleSetClick = (i: number) => {
    if (!completedSets[i]) {
      setCurrentSetIndex(i);
    }
  };

  // Запуск кардио-подхода
  const startCardioSet = (i: number) => {
    const target = Number(setValues[i]?.reps || getPlaceholder(i, 'reps')) || 60;
    setCardioSetIndex(i);
    setCardioTarget(target);
    setTimerValue(0);
    setIsTimerPaused(false);
    setIsTimerRunning(true);
    setTimerMode('cardio');
  };

  const pauseTimer = () => {
    setIsTimerPaused(true);
    setIsTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const resumeTimer = () => {
    setIsTimerPaused(false);
    setIsTimerRunning(true);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setIsTimerPaused(false);
    setTimerValue(0);
    if (timerRef.current) clearInterval(timerRef.current);
    if (timerMode === 'cardio' && cardioSetIndex !== null) {
      startCardioSet(cardioSetIndex);
      return;
    }
    setTimerMode('rest');
    setCardioSetIndex(null);
  };

  // Запуск отдыха
  const startRest = () => {
    setTimerMode('rest');
    setCardioSetIndex(null);
    setTimerValue(0);
    setIsTimerPaused(false);
    setIsTimerRunning(true);
  };

const addSet = () => {
  const lastIndex = setValues.length - 1;
  const newIndex = lastIndex + 1;

  const lastUserWeight = setValues[lastIndex]?.weight || '';
  const lastUserReps = setValues[lastIndex]?.reps || '';

  const planWeight = sets[newIndex]?.weight !== undefined ? String(sets[newIndex].weight) : '';
  const planReps = sets[newIndex]?.reps !== undefined ? String(sets[newIndex].reps) : '';

  const newWeight = planWeight || lastUserWeight || '0';
  const newReps = planReps || lastUserReps || (isCardio ? '60' : '0');

  setSetValues(prev => [...prev, { weight: newWeight, reps: newReps }]);
  setCompletedSets(prev => [...prev, false]);
};

  const [removingIndex, setRemovingIndex] = useState<number | null>(null);

  const removeSet = (i: number) => {
    // Если удаляем подход с активным кардио-таймером — сбросить в отдых
    if (isCardio && cardioSetIndex === i && isTimerActive) {
      setIsTimerRunning(false);
      setIsTimerPaused(false);
      setTimerValue(0);
      setTimerMode('rest');
      setCardioSetIndex(null);
      if (timerRef.current) clearInterval(timerRef.current);
    }

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

  const isTimerActive = isTimerRunning || isTimerPaused;

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
            <div 
              key={i} 
              className={cn(
                styles.setRow,
                completedSets[i] && styles.setRow_done,
                i === currentSetIndex && !completedSets[i] && (!isTimerActive || timerMode === 'cardio') && styles.setRow_current,
                removingIndex === i && styles.setRow_removing
              )} 
              onClick={() => handleSetClick(i)}>
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

                {isCardio ? (
                  <>
                    <input type="number" className={styles.setInput}
                      placeholder={getPlaceholder(i, 'reps')}
                      value={set.reps}
                      onChange={e => updateSetValue(i, 'reps', e.target.value)}
                      onClick={e => e.stopPropagation()}
                      style={{ width: `${Math.max(set.reps.length, getPlaceholder(i, 'reps').length, 1)}ch` }}
                    />
                    <span className={styles.unit}>сек</span>
                  </>
                ) : (
                  <>
                    <input type="number" className={styles.setInput}
                      placeholder={getPlaceholder(i, 'reps')}
                      value={set.reps}
                      onChange={e => updateSetValue(i, 'reps', e.target.value)}
                      onClick={e => e.stopPropagation()}
                      style={{ width: `${Math.max(set.reps.length, getPlaceholder(i, 'reps').length, 1)}ch` }}
                    />
                    <span className={styles.unit}>пвт</span>
                  </>
                )}
              </div>

              {isCardio && (
                <div className={styles.cardioActions}>
                  {cardioSetIndex !== i && (
                    <button className={styles.startCardioBtn} onClick={e => { e.stopPropagation(); startCardioSet(i); }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </button>
                  )}
                  {cardioSetIndex === i && isTimerRunning && (
                    <button className={styles.startCardioBtn} onClick={e => { e.stopPropagation(); pauseTimer(); }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" rx="1"/>
                        <rect x="14" y="4" width="4" height="16" rx="1"/>
                      </svg>
                    </button>
                  )}
                  {cardioSetIndex === i && isTimerPaused && (
                    <button className={styles.startCardioBtn} onClick={e => { e.stopPropagation(); resumeTimer(); }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </button>
                  )}
                </div>
              )}

              <div className={styles.buttons}>
                <button className={styles.removeBtn} onClick={e => { e.stopPropagation(); removeSet(i); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>

                <button className={cn(styles.checkBtn, completedSets[i] && styles.checkBtn_done)} onClick={e => { e.stopPropagation(); handleManualComplete(i); }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}

          <button className={styles.addSetBtn} onClick={addSet}>+ Добавить подход</button>

          {/* Блок таймера (отдых / кардио-подход) */}
          <div className={cn(styles.restTimer, isTimerActive && styles.restTimer_active)}>            
            <span className={styles.restLabel}>
              {timerMode === 'cardio' && cardioSetIndex !== null
                ? `Подход ${cardioSetIndex + 1}`
                : 'Отдых'}
            </span>
            <span className={styles.restValue}>{formatTime(timerValue)}</span>

            <div className={styles.restControls}>
              {!isTimerActive && (
                <button className={styles.restBtn} onClick={startRest}>Старт</button>
              )}
              {isTimerActive && timerMode === 'rest' && (
                <>
                  <button className={cn(styles.restBtn, styles.restBtn_reset)} onClick={resetTimer}>
                    Очистить
                  </button>
                  <button
                    className={cn(styles.restBtn, isTimerPaused ? styles.restBtn_primary : styles.restBtn_stop)}
                    onClick={isTimerPaused ? resumeTimer : pauseTimer}
                  >
                    {isTimerPaused ? 'Продолжить' : 'Стоп'}
                  </button>
                </>
              )}
              {isTimerActive && timerMode === 'cardio' && (
                <>
                  <button className={cn(styles.restBtn, styles.restBtn_reset)} onClick={resetTimer}>
                    Заново
                  </button>
                  <button
                    className={cn(styles.restBtn, isTimerPaused ? styles.restBtn_primary : styles.restBtn_stop)}
                    onClick={isTimerPaused ? resumeTimer : pauseTimer}
                  >
                    {isTimerPaused ? 'Продолжить' : 'Стоп'}
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