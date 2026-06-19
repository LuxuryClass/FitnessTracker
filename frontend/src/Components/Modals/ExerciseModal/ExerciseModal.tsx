import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MuscleGroupBadge } from '@/Components/Common/MuscleGroupBadge/MuscleGroupBadge';
import { Button } from '@/Components/UI/Button/Button';
import { createPortal } from 'react-dom';
import styles from './Styles.module.scss';
import cn from 'classnames';
import type { ExerciseSet } from '@/Auth/authApi';

// ─── Types ──────────────────────────────────────────────
interface SetGroup {
  id: string;
  count: number;
  reps: number;
  weight: number;
}

interface MediaSlide {
  id: string;
  url: string;
  type: 'image' | 'video';
}

interface ExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  muscleGroups?: string[];
  targetMuscles?: string[];
  equipment?: string[];
  media?: MediaSlide[];
  description?: string;
  sets?: ExerciseSet[];
  type?: 'default' | 'session';
  forceSaveLabel?: boolean;
  editable?: boolean;
  showSaveButton?: boolean;
  onDescriptionChange?: (value: string) => void;
  onConfirm?: (sets: ExerciseSet[], description: string) => void;
}

// ─── Helpers ────────────────────────────────────────────
const generateId = () => Math.random().toString(36).substr(2, 9);

const groupConsecutiveSets = (sets: ExerciseSet[]): SetGroup[] => {
  const groups: SetGroup[] = [];
  let current: ExerciseSet[] = [];

  for (const set of sets) {
    if (current.length === 0 || (current[0].reps === set.reps && current[0].weight === set.weight)) {
      current.push(set);
    } else {
      groups.push({ id: generateId(), count: current.length, reps: current[0].reps, weight: current[0].weight });
      current = [set];
    }
  }

  if (current.length > 0) {
    groups.push({ id: generateId(), count: current.length, reps: current[0].reps, weight: current[0].weight });
  }

  return groups;
};

// ─── Component ──────────────────────────────────────────
const ExerciseModal = ({
  isOpen,
  onClose,
  name,
  muscleGroups = [],
  targetMuscles = [],
  equipment = [],
  media,
  description = '',
  sets: initialSets,
  type = 'default',
  editable = true,
  showSaveButton = false,
  onDescriptionChange,
  onConfirm,
}: ExerciseModalProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const [heightPercent, setHeightPercent] = useState(70);
  const startY = useRef(0);
  const startHeight = useRef(70);
  const isDragging = useRef(false);
  const currentHeightRef = useRef(70);
  const pendingFrameRef = useRef<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<'collapsed' | 'expanded'>('collapsed');
  const [allSets, setAllSets] = useState<ExerciseSet[]>([]);
  const [groups, setGroups] = useState<SetGroup[]>([]);

  const [localDescription, setLocalDescription] = useState(description);

  const slides = media ?? [];
  const [slideIndex, setSlideIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const touchStartX = useRef(0);

  const currentSlide = slides[slideIndex] ?? null;

  // ─── Open / Close ─────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setHeightPercent(70);
      currentHeightRef.current = 70;

      if (type === 'default') {
        if (initialSets && initialSets.length > 0) {
          setMode('collapsed');
          setGroups(groupConsecutiveSets(initialSets));
          setAllSets([]);
        } else {
          setMode('collapsed');
          setGroups([{ id: generateId(), count: 1, reps: 0, weight: 0 }]);
          setAllSets([]);
        }
      }

      requestAnimationFrame(() => requestAnimationFrame(() => setIsAnimating(true)));
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialSets, type]);

  useEffect(() => {
    setLocalDescription(description);
  }, [description]);

  useEffect(() => {
    setSlideIndex(0);
  }, [media]);

  // ─── Mode toggling ────────────────────────────────────
  const handleCollapse = () => {
    setGroups(groupConsecutiveSets(allSets));
    setAllSets([]);
    setMode('collapsed');
  };

  const handleExpand = () => {
    const expanded = groups.flatMap(g => Array.from({ length: g.count }, () => ({ reps: g.reps, weight: g.weight })));
    setAllSets(expanded);
    setGroups([]);
    setMode('expanded');
  };

  // ─── Expanded helpers ─────────────────────────────────
  const changeSet = (index: number, field: 'weight' | 'reps', delta: number) => {
    if (!editable) return;
    setAllSets(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: Math.max(0, next[index][field] + delta) };
      return next;
    });
  };

  const inputSet = (index: number, field: 'weight' | 'reps', value: string) => {
    if (!editable) return;
    const num = parseInt(value) || 0;
    setAllSets(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: Math.max(0, num) };
      return next;
    });
  };

  const addSet = () => {
    if (!editable) return;
    const last = allSets[allSets.length - 1] || { reps: 0, weight: 0 };
    setAllSets(prev => [...prev, { ...last }]);
  };

  // ─── Collapsed helpers ────────────────────────────────
  const changeGroup = (id: string, field: 'count' | 'reps' | 'weight', value: string) => {
    if (!editable) return;
    const num = Math.max(0, parseInt(value) || 0);
    setGroups(prev => prev.map(g => g.id === id ? { ...g, [field]: num } : g).filter(g => g.count > 0));
  };

  const deltaGroup = (id: string, field: 'count' | 'reps' | 'weight', delta: number) => {
    if (!editable) return;
    setGroups(prev => prev.map(g => {
      if (g.id !== id) return g;
      const newVal = Math.max(0, g[field] + delta);
      return { ...g, [field]: newVal };
    }).filter(g => g.count > 0));
  };

  const addGroup = () => {
    if (!editable) return;
    setGroups(prev => [...prev, { id: generateId(), count: 1, reps: 0, weight: 0 }]);
  };

  // ─── Touch handlers ───────────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    isDragging.current = true;
    startY.current = e.touches[0].clientY;
    startHeight.current = currentHeightRef.current;
    modalRef.current?.classList.add(styles.modal_dragging);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const clientY = e.touches[0].clientY;
    if (pendingFrameRef.current !== null) return;
    pendingFrameRef.current = requestAnimationFrame(() => {
      pendingFrameRef.current = null;
      const dy = startY.current - clientY;
      const delta = (dy / window.innerHeight) * 100;
      const next = Math.min(95, Math.max(30, startHeight.current + delta));
      currentHeightRef.current = next;
      if (modalRef.current) {
        modalRef.current.style.height = `${next}vh`;
      }
    });
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
    if (pendingFrameRef.current !== null) {
      cancelAnimationFrame(pendingFrameRef.current);
      pendingFrameRef.current = null;
    }
    modalRef.current?.classList.remove(styles.modal_dragging);
    const final = currentHeightRef.current;
    if (final < 35) {
      onClose();
      return;
    }
    setHeightPercent(final);
  }, [onClose]);

  // ─── Submit ───────────────────────────────────────────
  const handleConfirm = () => {
    const finalSets = mode === 'expanded'
      ? allSets
      : groups.flatMap(g => Array.from({ length: g.count }, () => ({ reps: g.reps, weight: g.weight })));
    onConfirm?.(finalSets, localDescription);
    onClose();
  };

  // ─── Media swipe ──────────────────────────────────────
  const handleMediaTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleMediaTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) <= 50) return;
    if (diff > 0 && slideIndex < slides.length - 1) {
      setSlideIndex(prev => prev + 1);
    } else if (diff < 0 && slideIndex > 0) {
      setSlideIndex(prev => prev - 1);
    }
  };

  // ─── Render ───────────────────────────────────────────
  if (!isVisible) return null;

  const primarySet = new Set(muscleGroups);
  const secondaryMuscles = targetMuscles.filter(m => !primarySet.has(m));
  const hasSets = groups.length > 0 || allSets.length > 0;

  return (
    <>
      <div className={cn(styles.overlay, isAnimating && styles.overlay_visible)} onClick={onClose} />
      <div ref={modalRef} className={cn(styles.modal, isAnimating && styles.modal_open)} style={{ height: `${heightPercent}vh` }}>
        <div 
          className={styles.handleArea}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className={styles.handle} />
        </div>
        <div className={styles.content}>
          <div className={styles.header}>
            <h3 className={styles.name}>{name}</h3>
          </div>

          <div className={styles.media} onTouchStart={handleMediaTouchStart} onTouchEnd={handleMediaTouchEnd}>
            {currentSlide ? (
              <>
                {currentSlide.type === 'video' ? (
                  <video ref={videoRef} src={currentSlide.url} controls className={styles.mediaContent}
                    onClick={() => videoRef.current?.paused ? videoRef.current.play() : videoRef.current?.pause()} />
                ) : (
                  <img src={currentSlide.url} alt={name} className={styles.mediaContent} onClick={() => setIsFullscreen(true)} />
                )}
                {slides.length > 1 && (
                  <div className={styles.dots}>
                    {slides.map((slide, i) => (
                      <button key={slide.id} className={cn(styles.dot, i === slideIndex && styles.dotActive)} onClick={() => setSlideIndex(i)} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className={styles.mediaPlaceholder}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M21 19V5C21 3.9 20.1 3 19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19Z" stroke="currentColor" strokeWidth="1.5"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><path d="M21 15L16 10L5 21" stroke="currentColor" strokeWidth="1.5"/></svg>
                <span className={styles.mediaText}>Нет фото или видео</span>
              </div>
            )}
          </div>

          {isFullscreen && currentSlide && currentSlide.type === 'image' && createPortal(
            <div className={styles.fullscreen} onClick={() => setIsFullscreen(false)}>
              <img src={currentSlide.url} alt={name} className={styles.fullscreenImage} />
            </div>,
            document.body
          )}

          {(muscleGroups.length > 0 || secondaryMuscles.length > 0 || equipment.length > 0) && (
            <div className={styles.tagsRow}>
              {(muscleGroups.length > 0 || secondaryMuscles.length > 0) && (
                <div className={styles.tagGroup}>
                  <span className={styles.sectionLabel}>Мышцы:</span>
                  <MuscleGroupBadge type="block" groups={[...muscleGroups, ...secondaryMuscles]} primaryGroups={muscleGroups} />
                </div>
              )}
              {equipment.length > 0 && (
                <div className={styles.tagGroup}>
                  <span className={styles.sectionLabel}>Оборудование:</span>
                  <MuscleGroupBadge type="block" groups={equipment} />
                </div>
              )}
            </div>
          )}

          {(type === 'default' || (type === 'session' && localDescription)) && (
            <div className={styles.section}>
              {type === 'default' ? (
                <textarea
                  className={styles.textarea}
                  value={localDescription}
                  onChange={e => {
                    setLocalDescription(e.target.value);
                    onDescriptionChange?.(e.target.value);
                  }}
                  placeholder="Добавьте описание (необязательно)"
                  rows={3}
                />
              ) : (
                <div className={styles.descriptionReadonly}>
                  <span className={styles.sectionLabel}>Описание:</span>
                  <p className={styles.descriptionText}>{localDescription}</p>
                </div>
              )}
            </div>
          )}

          {type === 'default' && (
            <div className={styles.section}>
              <div className={styles.setsHeader}>
                <span className={cn(styles.sectionLabel, styles.sectionLabel_settings)}>Настройки упражнения</span>
                {hasSets && (
                  <button className={styles.modeToggle} onClick={mode === 'expanded' ? handleCollapse : handleExpand}>
                    {mode === 'expanded' ? 'Свернуть' : 'Развернуть'}
                  </button>
                )}
              </div>

              {mode === 'expanded' && (
                <>
                  {allSets.length > 0 && (
                    <div className={styles.setGrid}>
                      <span className={styles.columnLabel}>№</span>
                      <span className={styles.columnLabel}>Повторения</span>
                      <span className={styles.columnLabel}>Вес</span>
                      {allSets.map((set, i) => (
                        <React.Fragment key={i}>
                          <span className={styles.setIndex}>{i + 1}</span>
                          <div className={styles.setField}>
                            <button className={styles.setBtn} onClick={() => changeSet(i, 'reps', -1)}>−</button>
                            <input type="number" className={styles.setInput} value={set.reps} onChange={e => inputSet(i, 'reps', e.target.value)} />
                            <button className={styles.setBtn} onClick={() => changeSet(i, 'reps', 1)}>+</button>
                          </div>
                          <div className={styles.setField}>
                            <button className={styles.setBtn} onClick={() => changeSet(i, 'weight', -1)}>−</button>
                            <input type="number" className={styles.setInput} value={set.weight} onChange={e => inputSet(i, 'weight', e.target.value)} />
                            <button className={styles.setBtn} onClick={() => changeSet(i, 'weight', 1)}>+</button>
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                  <button className={styles.addSetBtn} onClick={addSet}>+ Добавить подход</button>
                </>
              )}

              {mode === 'collapsed' && (
                <>
                  {groups.length > 0 && (
                    <div className={styles.groupGrid}>
                      <span className={styles.columnLabel}>Подходы</span>
                      <span className={styles.columnLabel}>Повторения</span>
                      <span className={styles.columnLabel}>Вес</span>
                      {groups.map(group => (
                        <React.Fragment key={group.id}>
                          <div className={cn(styles.groupField, styles.groupFieldPrimary)}>
                            <button className={cn(styles.groupBtn, styles.groupBtnPrimary)} onClick={() => deltaGroup(group.id, 'count', -1)}>−</button>
                            <input type="number" className={styles.compactInput} value={group.count} onChange={e => changeGroup(group.id, 'count', e.target.value)} />
                            <button className={cn(styles.groupBtn, styles.groupBtnPrimary)} onClick={() => deltaGroup(group.id, 'count', 1)}>+</button>
                          </div>
                          <div className={styles.groupField}>
                            <button className={styles.groupBtn} onClick={() => deltaGroup(group.id, 'reps', -1)}>−</button>
                            <input type="number" className={styles.compactInput} value={group.reps} onChange={e => changeGroup(group.id, 'reps', e.target.value)} />
                            <button className={styles.groupBtn} onClick={() => deltaGroup(group.id, 'reps', 1)}>+</button>
                          </div>
                          <div className={styles.groupField}>
                            <button className={styles.groupBtn} onClick={() => deltaGroup(group.id, 'weight', -1)}>−</button>
                            <input type="number" className={styles.compactInput} value={group.weight} onChange={e => changeGroup(group.id, 'weight', e.target.value)} />
                            <button className={styles.groupBtn} onClick={() => deltaGroup(group.id, 'weight', 1)}>+</button>
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                  <button className={styles.addGroupBtn} onClick={addGroup}>+ Добавить подходы</button>
                </>
              )}
            </div>
          )}

          {type === 'default' && (
            <div className={styles.buttons}>
              <Button size="l" className={styles.confirmBtn} onClick={handleConfirm}>
                {initialSets && initialSets.length > 0 ? 'Сохранить' : 'Добавить'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ExerciseModal;