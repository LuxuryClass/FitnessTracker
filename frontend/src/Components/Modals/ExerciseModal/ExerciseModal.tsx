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

interface ExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  muscleGroup: string;
  targetMuscles?: string[];
  equipment?: string[];
  imageUrl?: string;
  videoUrl?: string;
  description?: string;
  sets?: ExerciseSet[];
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
export const ExerciseModal = ({
  isOpen,
  onClose,
  name,
  muscleGroup,
  targetMuscles = [],
  equipment = [],
  imageUrl,
  videoUrl,
  description = '',
  sets: initialSets,
  onDescriptionChange,
  onConfirm,
}: ExerciseModalProps) => {
  // Visibility & animation
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Sheet height
  const [heightPercent, setHeightPercent] = useState(70);
  const startY = useRef(0);
  const startHeight = useRef(70);
  const isDragging = useRef(false);
  const currentHeightRef = useRef(70);
  const pendingFrameRef = useRef<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Mode & data
  const [mode, setMode] = useState<'collapsed' | 'expanded'>('collapsed');
  const [allSets, setAllSets] = useState<ExerciseSet[]>([]);
  const [groups, setGroups] = useState<SetGroup[]>([]);

  // Description
  const [localDescription, setLocalDescription] = useState(description);

  // Media
  const [previewUrl, setPreviewUrl] = useState<string | null>(imageUrl || videoUrl || null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(
    imageUrl ? 'image' : videoUrl ? 'video' : null
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // ─── Open / Close ─────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setHeightPercent(70);
      currentHeightRef.current = 70;
      
      if (initialSets && initialSets.length > 0) {
        setMode('collapsed');
        setGroups(groupConsecutiveSets(initialSets));
        setAllSets([]);
      } else {
        setMode('collapsed');
        setGroups([{ id: generateId(), count: 1, reps: 0, weight: 0 }]);
        setAllSets([]);
      }
      
      requestAnimationFrame(() => requestAnimationFrame(() => setIsAnimating(true)));
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialSets]);

  useEffect(() => {
    setLocalDescription(description);
  }, [description]);

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
    setAllSets(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: Math.max(0, next[index][field] + delta) };
      return next;
    });
  };

  const inputSet = (index: number, field: 'weight' | 'reps', value: string) => {
    const num = parseInt(value) || 0;
    setAllSets(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: Math.max(0, num) };
      return next;
    });
  };

  const addSet = () => {
    const last = allSets[allSets.length - 1] || { reps: 0, weight: 0 };
    setAllSets(prev => [...prev, { ...last }]);
  };

  // ─── Collapsed helpers ────────────────────────────────
  const changeGroup = (id: string, field: 'count' | 'reps' | 'weight', value: string) => {
    const num = Math.max(0, parseInt(value) || 0);
    setGroups(prev => prev.map(g => g.id === id ? { ...g, [field]: num } : g).filter(g => g.count > 0));
  };

  const deltaGroup = (id: string, field: 'count' | 'reps' | 'weight', delta: number) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== id) return g;
      const newVal = Math.max(0, g[field] + delta);
      return { ...g, [field]: newVal };
    }).filter(g => g.count > 0));
  };

  const addGroup = () => {
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

  // ─── Media handlers ───────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
    e.target.value = '';
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  // ─── Render ───────────────────────────────────────────
  if (!isVisible) return null;

  return (
    <>
      <div className={cn(styles.overlay, isAnimating && styles.overlay_visible)} onClick={onClose} />
      <div ref={modalRef} className={cn(styles.modal, isAnimating && styles.modal_open)} style={{ height: `${heightPercent}vh` }}>
        <div className={styles.handle} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} />
        
        <div className={styles.content}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.badgeWrapper}>
              <MuscleGroupBadge groups={[muscleGroup]} />
            </div>
            <h3 className={styles.name}>{name}</h3>
          </div>

          {/* Media */}
          <div className={styles.media}>
            {previewUrl ? (
              <>
                {mediaType === 'video' ? (
                  <video ref={videoRef} src={previewUrl} controls className={styles.mediaContent}
                    onClick={() => videoRef.current?.paused ? videoRef.current.play() : videoRef.current?.pause()} />
                ) : (
                  <img src={previewUrl} alt={name} className={styles.mediaContent} onClick={() => setIsFullscreen(true)} />
                )}
                <button className={styles.editMediaBtn} onClick={handleEditClick}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15.2322 5.23223L18.7678 8.76777M16.7322 3.73223C17.7085 2.75592 19.2915 2.75592 20.2678 3.73223C21.2441 4.70854 21.2441 6.29146 20.2678 7.26777L6.5 21.0355H3V17.4645L16.7322 3.73223Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <button className={styles.deleteMediaBtn} onClick={e => { e.stopPropagation(); setPreviewUrl(null); setMediaType(null); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 6H5H21M8 6V4C8 2.89543 8.89543 2 10 2H14C15.1046 2 16 2.89543 16 4V6M19 6V20C19 21.1046 18.1046 22 17 22H7C5.89543 22 5 21.1046 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </>
            ) : (
              <div className={styles.mediaPlaceholder}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M21 19V5C21 3.9 20.1 3 19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19Z" stroke="currentColor" strokeWidth="1.5"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><path d="M21 15L16 10L5 21" stroke="currentColor" strokeWidth="1.5"/></svg>
                <span className={styles.mediaText}>Добавить фото или видео</span>
                <button className={styles.uploadBtn} onClick={handleEditClick}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 15V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V15M17 8L12 3M12 3L7 8M12 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Загрузить
                </button>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileChange} className={styles.fileInput} />
          </div>

          {/* Fullscreen */}
          {isFullscreen && previewUrl && mediaType === 'image' && createPortal(
            <div className={styles.fullscreen} onClick={() => setIsFullscreen(false)}>
              <img src={previewUrl} alt={name} className={styles.fullscreenImage} />
            </div>,
            document.body
          )}

          {/* Tags */}
          {(targetMuscles.length > 0 || equipment.length > 0) && (
            <div className={styles.tagsRow}>
              <span className={styles.sectionLabel}>Оборудование:</span>
              {equipment.length > 0 && <MuscleGroupBadge groups={equipment} className={styles.tag} />}
            </div>
          )}

          {/* Description */}
          <div className={styles.section}>
            <textarea className={styles.textarea} value={localDescription}
              onChange={e => { setLocalDescription(e.target.value); onDescriptionChange?.(e.target.value); }}
              placeholder="Добавьте описание..." rows={3} />
          </div>

          {/* Sets */}
          <div className={styles.section}>
            <div className={styles.setsHeader}>
              <span className={cn(styles.sectionLabel, styles.sectionLabel_settings)}>Настройки упражнения</span>
              <button className={styles.modeToggle} onClick={mode === 'expanded' ? handleCollapse : handleExpand}>
                {mode === 'expanded' ? 'Свернуть' : 'Развернуть'}
              </button>
            </div>

            {mode === 'expanded' ? (
              <>
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
                <button className={styles.addSetBtn} onClick={addSet}>+ Добавить подход</button>
              </>
            ) : (
              <>
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
                <button className={styles.addGroupBtn} onClick={addGroup}>+ Добавить подходы</button>
              </>
            )}
          </div>

          {/* Submit */}
          <div className={styles.buttons}>
            <Button size="l" className={styles.confirmBtn} onClick={handleConfirm}>Добавить</Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ExerciseModal;