import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/Components/UI/Button/Button';
import { Input } from '@/Components/UI/Input/Input';
import styles from './Styles.module.scss';
import cn from 'classnames';

interface Equipment {
  id: string;
  label: string;
  isCustom?: boolean;
}

interface MuscleGroup {
  id: string;
  label: string;
  isCustom?: boolean;
}

interface MediaItem {
  url: string;
  type: 'image' | 'video';
}

const DEFAULT_EQUIPMENT: Equipment[] = [
  { id: 'barbell', label: 'Штанга' },
  { id: 'dumbbells', label: 'Гантели' },
  { id: 'machine', label: 'Тренажёр' },
  { id: 'bodyweight', label: 'Свой вес' },
  { id: 'kettlebell', label: 'Гиря' },
  { id: 'resistance_band', label: 'Резинка' },
  { id: 'cable', label: 'Кроссовер' },
];

const PRIMARY_MUSCLES: MuscleGroup[] = [
  { id: 'chest', label: 'Грудь' },
  { id: 'back', label: 'Спина' },
  { id: 'legs', label: 'Ноги' },
  { id: 'shoulders', label: 'Плечи' },
  { id: 'arms', label: 'Руки' },
  { id: 'core', label: 'Корпус' },
  { id: 'cardio', label: 'Кардио' },
];

const SECONDARY_BY_PRIMARY: Record<string, MuscleGroup[]> = {
  chest: [
    { id: 'upper_chest', label: 'Верх груди' },
    { id: 'middle_chest', label: 'Середина груди' },
    { id: 'lower_chest', label: 'Низ груди' },
    { id: 'front_delt', label: 'Передняя дельта' },
    { id: 'triceps', label: 'Трицепс' },
  ],
  back: [
    { id: 'lats', label: 'Широчайшие' },
    { id: 'traps', label: 'Трапеции' },
    { id: 'rhomboids', label: 'Ромбовидные' },
    { id: 'erectors', label: 'Разгибатели спины' },
    { id: 'rear_delt', label: 'Задняя дельта' },
    { id: 'biceps', label: 'Бицепс' },
  ],
  legs: [
    { id: 'quadriceps', label: 'Квадрицепс' },
    { id: 'hamstrings', label: 'Бицепс бедра' },
    { id: 'glutes', label: 'Ягодичные' },
    { id: 'calves', label: 'Икроножные' },
  ],
  shoulders: [
    { id: 'front_delt', label: 'Передняя дельта' },
    { id: 'side_delt', label: 'Средняя дельта' },
    { id: 'rear_delt', label: 'Задняя дельта' },
    { id: 'traps', label: 'Трапеции' },
  ],
  arms: [
    { id: 'biceps', label: 'Бицепс' },
    { id: 'triceps', label: 'Трицепс' },
    { id: 'forearms', label: 'Предплечья' },
  ],
  core: [
    { id: 'abs', label: 'Пресс' },
    { id: 'obliques', label: 'Косые мышцы' },
  ],
};

const CreateExercisePage = () => {
  const navigate = useNavigate();

  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [equipmentList, setEquipmentList] = useState<Equipment[]>(DEFAULT_EQUIPMENT);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [primaryMuscle, setPrimaryMuscle] = useState<string | null>(null);
  const [secondaryMuscles, setSecondaryMuscles] = useState<string[]>([]);
  const [customSecondaryList, setCustomSecondaryList] = useState<MuscleGroup[]>([]);

  const [isAddingEquipment, setIsAddingEquipment] = useState(false);
  const [customEquipmentName, setCustomEquipmentName] = useState('');
  const [editingEquipmentId, setEditingEquipmentId] = useState<string | null>(null);
  const [editingEquipmentName, setEditingEquipmentName] = useState('');
  const customEquipInputRef = useRef<HTMLInputElement>(null);
  const editEquipInputRef = useRef<HTMLInputElement>(null);

  const [isAddingSecondary, setIsAddingSecondary] = useState(false);
  const [customSecondaryName, setCustomSecondaryName] = useState('');
  const [editingSecondaryId, setEditingSecondaryId] = useState<string | null>(null);
  const [editingSecondaryName, setEditingSecondaryName] = useState('');
  const customSecondInputRef = useRef<HTMLInputElement>(null);
  const editSecondInputRef = useRef<HTMLInputElement>(null);

  const secondaryList = useMemo(() => {
    const base = primaryMuscle ? SECONDARY_BY_PRIMARY[primaryMuscle] || [] : [];
    return [...base, ...customSecondaryList];
  }, [primaryMuscle, customSecondaryList]);

  const currentMedia = mediaItems[currentMediaIndex] || null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const type = file.type.startsWith('video/') ? 'video' : 'image';
    setMediaItems(prev => [...prev, { url, type }]);
    setCurrentMediaIndex(mediaItems.length);
    e.target.value = '';
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleDeleteMedia = (index: number) => {
    setMediaItems(prev => prev.filter((_, i) => i !== index));
    if (currentMediaIndex >= index && currentMediaIndex > 0) {
      setCurrentMediaIndex(prev => Math.max(0, prev - 1));
    }
  };

  const handleToggleEquipment = (id: string) => {
    setSelectedEquipment(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);
  };

  const handleStartAddEquipment = () => {
    setIsAddingEquipment(true);
    setTimeout(() => customEquipInputRef.current?.focus(), 50);
  };

  const handleFinishAddEquipment = () => {
    const trimmed = customEquipmentName.trim();
    if (trimmed) {
      const newId = `custom_eq_${Date.now()}`;
      setEquipmentList(prev => [...prev, { id: newId, label: trimmed, isCustom: true }]);
      setSelectedEquipment(prev => [...prev, newId]);
    }
    setCustomEquipmentName('');
    setIsAddingEquipment(false);
  };

  const handleCustomEquipmentKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleFinishAddEquipment();
    if (e.key === 'Escape') { setCustomEquipmentName(''); setIsAddingEquipment(false); }
  };

  const handleStartEditEquipment = (id: string, label: string) => {
    setEditingEquipmentId(id);
    setEditingEquipmentName(label);
    setTimeout(() => editEquipInputRef.current?.focus(), 50);
  };

  const handleFinishEditEquipment = () => {
    const trimmed = editingEquipmentName.trim();
    if (trimmed && editingEquipmentId) {
      setEquipmentList(prev => prev.map(e => e.id === editingEquipmentId ? { ...e, label: trimmed } : e));
    }
    setEditingEquipmentId(null);
    setEditingEquipmentName('');
  };

  const handleEditEquipmentKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleFinishEditEquipment();
    if (e.key === 'Escape') { setEditingEquipmentId(null); setEditingEquipmentName(''); }
  };

  const handleDeleteCustomEquipment = (id: string) => {
    setEditingEquipmentId(null);
    setEquipmentList(prev => prev.filter(e => e.id !== id));
    setSelectedEquipment(prev => prev.filter(e => e !== id));
  };

  const handleToggleSecondary = (id: string) => {
    setSecondaryMuscles(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const handleStartAddSecondary = () => {
    setIsAddingSecondary(true);
    setTimeout(() => customSecondInputRef.current?.focus(), 50);
  };

  const handleFinishAddSecondary = () => {
    const trimmed = customSecondaryName.trim();
    if (trimmed) {
      const newId = `custom_sec_${Date.now()}`;
      setCustomSecondaryList(prev => [...prev, { id: newId, label: trimmed, isCustom: true }]);
      setSecondaryMuscles(prev => [...prev, newId]);
    }
    setCustomSecondaryName('');
    setIsAddingSecondary(false);
  };

  const handleCustomSecondaryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleFinishAddSecondary();
    if (e.key === 'Escape') { setCustomSecondaryName(''); setIsAddingSecondary(false); }
  };

  const handleStartEditSecondary = (id: string, label: string) => {
    setEditingSecondaryId(id);
    setEditingSecondaryName(label);
    setTimeout(() => editSecondInputRef.current?.focus(), 50);
  };

  const handleFinishEditSecondary = () => {
    const trimmed = editingSecondaryName.trim();
    if (trimmed && editingSecondaryId) {
      setCustomSecondaryList(prev => prev.map(m => m.id === editingSecondaryId ? { ...m, label: trimmed } : m));
    }
    setEditingSecondaryId(null);
    setEditingSecondaryName('');
  };

  const touchStartX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentMediaIndex < mediaItems.length - 1) {
        setCurrentMediaIndex(prev => prev + 1);
      } else if (diff < 0 && currentMediaIndex > 0) {
        setCurrentMediaIndex(prev => prev - 1);
      }
    }
  };

  const handleEditSecondaryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleFinishEditSecondary();
    if (e.key === 'Escape') { setEditingSecondaryId(null); setEditingSecondaryName(''); }
  };

  const handleDeleteCustomSecondary = (id: string) => {
    setEditingSecondaryId(null);
    setCustomSecondaryList(prev => prev.filter(m => m.id !== id));
    setSecondaryMuscles(prev => prev.filter(m => m !== id));
  };

  const handleSave = () => {
    const data = {
      name,
      description,
      equipment: selectedEquipment.map(id => equipmentList.find(e => e.id === id)?.label).filter(Boolean),
      primaryMuscle: PRIMARY_MUSCLES.find(m => m.id === primaryMuscle)?.label,
      secondaryMuscles: secondaryMuscles.map(id => secondaryList.find(m => m.id === id)?.label).filter(Boolean),
      media: mediaItems,
    };
    console.log('Создаём упражнение:', data);
    navigate(-1);
  };

  const isValid = name.trim().length > 0;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button size="back" onClick={() => navigate(-1)} />
        <h1 className={styles.title}>Создать упражнение</h1>
      </div>

      <div className={cn(styles.content, !isValid && styles.content_invalid)}>
<div 
  className={styles.media}
  onTouchStart={handleTouchStart}
  onTouchEnd={handleTouchEnd}
>
  {currentMedia ? (
    <>
      {currentMedia.type === 'video' ? (
        <video ref={videoRef} src={currentMedia.url} controls className={styles.mediaContent} />
      ) : (
        <img src={currentMedia.url} alt="" className={styles.mediaContent} />
      )}
      <button className={styles.editMediaBtn} onClick={handleEditClick}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15.2322 5.23223L18.7678 8.76777M16.7322 3.73223C17.7085 2.75592 19.2915 2.75592 20.2678 3.73223C21.2441 4.70854 21.2441 6.29146 20.2678 7.26777L6.5 21.0355H3V17.4645L16.7322 3.73223Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      <button className={styles.deleteMediaBtn} onClick={() => handleDeleteMedia(currentMediaIndex)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 6H5H21M8 6V4C8 2.89543 8.89543 2 10 2H14C15.1046 2 16 2.89543 16 4V6M19 6V20C19 21.1046 18.1046 22 17 22H7C5.89543 22 5 21.1046 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      <button className={styles.addMoreBtn} onClick={handleEditClick}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
      </button>

      {mediaItems.length > 1 && (
        <div className={styles.dots}>
          {mediaItems.map((_, i) => (
            <button key={i} className={cn(styles.dot, i === currentMediaIndex && styles.dotActive)} onClick={() => setCurrentMediaIndex(i)} />
          ))}
        </div>
      )}
    </>
  ) : (
    <div className={styles.mediaPlaceholder}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M21 19V5C21 3.9 20.1 3 19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19Z" stroke="currentColor" strokeWidth="1.5"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><path d="M21 15L16 10L5 21" stroke="currentColor" strokeWidth="1.5"/></svg>
      <span>Добавить фото или видео</span>
      <button className={styles.uploadBtn} onClick={handleEditClick}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 15V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V15M17 8L12 3M12 3L7 8M12 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Загрузить
      </button>
    </div>
  )}
  <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileChange} className={styles.fileInput} />
</div>

        <div className={styles.section}>
          <span className={styles.sectionLabel}>Название (Обязательное поле)</span>
          <Input type="text" value={name} onChange={setName} placeholder="Введите название" className={styles.nameInput} />
        </div>

        <div className={styles.section}>
          <span className={styles.sectionLabel}>Описание</span>
          <textarea className={styles.textarea} value={description} onChange={e => setDescription(e.target.value)} placeholder="Добавьте описание к упражнению" rows={3} />
        </div>

        <div className={styles.section}>
          <span className={styles.sectionLabel}>Оборудование</span>
          <div className={styles.chips}>
            {equipmentList.map(eq =>
              editingEquipmentId === eq.id ? (
                <div key={eq.id} className={cn(styles.chip, styles.chipEditing)}>
                  <input ref={editEquipInputRef} type="text" className={styles.chipEditInput} value={editingEquipmentName}
                    onChange={e => setEditingEquipmentName(e.target.value)} onBlur={handleFinishEditEquipment} onKeyDown={handleEditEquipmentKeyDown}
                    size={Math.max(4, editingEquipmentName.length || 4)} />
                  <button className={styles.chipRemove} onMouseDown={e => e.preventDefault()} onTouchStart={e => e.preventDefault()} onClick={() => handleDeleteCustomEquipment(eq.id)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              ) : (
                <button key={eq.id} className={cn(styles.chip, selectedEquipment.includes(eq.id) && styles.chipActive)}
                  onClick={() => handleToggleEquipment(eq.id)}
                  onContextMenu={e => { if (eq.isCustom) { e.preventDefault(); handleStartEditEquipment(eq.id, eq.label); } }}>
                  {eq.label}
                </button>
              )
            )}
            {isAddingEquipment ? (
              <div className={cn(styles.chip, styles.chipEditing)}>
                <input ref={customEquipInputRef} type="text" className={styles.chipEditInput} value={customEquipmentName}
                  onChange={e => setCustomEquipmentName(e.target.value)} onBlur={handleFinishAddEquipment} onKeyDown={handleCustomEquipmentKeyDown}
                  placeholder="Название" size={Math.max(4, customEquipmentName.length || 4)} />
                <button className={styles.chipRemove} onMouseDown={e => e.preventDefault()} onTouchStart={e => e.preventDefault()} onClick={() => { setCustomEquipmentName(''); setIsAddingEquipment(false); }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            ) : (
              <button className={cn(styles.chip, styles.chipAdd)} onClick={handleStartAddEquipment}>+</button>
            )}
          </div>
        </div>

        <div className={styles.section}>
          <span className={styles.sectionLabel}>Группа мышц</span>
          <div className={styles.chips}>
            {PRIMARY_MUSCLES.map(m => (
              <button key={m.id} className={cn(styles.chip, primaryMuscle === m.id && styles.chipActive)} onClick={() => setPrimaryMuscle(primaryMuscle === m.id ? null : m.id)}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary muscles */}
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Вторичные мышцы</span>
          {primaryMuscle ? (
            <div className={styles.chips}>
              {secondaryList.map(m =>
                editingSecondaryId === m.id ? (
                  <div key={m.id} className={cn(styles.chip, styles.chipEditing)}>
                    <input ref={editSecondInputRef} type="text" className={styles.chipEditInput} value={editingSecondaryName}
                      onChange={e => setEditingSecondaryName(e.target.value)} onBlur={handleFinishEditSecondary} onKeyDown={handleEditSecondaryKeyDown}
                      size={Math.max(4, editingSecondaryName.length || 4)} />
                    <button className={styles.chipRemove} onMouseDown={e => e.preventDefault()} onTouchStart={e => e.preventDefault()} onClick={() => handleDeleteCustomSecondary(m.id)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                ) : (
                  <button key={m.id} className={cn(styles.chip, secondaryMuscles.includes(m.id) && styles.chipActive)}
                    onClick={() => handleToggleSecondary(m.id)}
                    onContextMenu={e => { if (m.isCustom) { e.preventDefault(); handleStartEditSecondary(m.id, m.label); } }}>
                    {m.label}
                  </button>
                )
              )}
              {isAddingSecondary ? (
                <div className={cn(styles.chip, styles.chipEditing)}>
                  <input ref={customSecondInputRef} type="text" className={styles.chipEditInput} value={customSecondaryName}
                    onChange={e => setCustomSecondaryName(e.target.value)} onBlur={handleFinishAddSecondary} onKeyDown={handleCustomSecondaryKeyDown}
                    placeholder="Название" size={Math.max(4, customSecondaryName.length || 4)} />
                  <button className={styles.chipRemove} onMouseDown={e => e.preventDefault()} onTouchStart={e => e.preventDefault()} onClick={() => { setCustomSecondaryName(''); setIsAddingSecondary(false); }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              ) : (
                <button className={cn(styles.chip, styles.chipAdd)} onClick={handleStartAddSecondary}>+</button>
              )}
            </div>
          ) : (
            <p className={styles.emptyHint}>Сперва выберите группу мышц</p>
          )}
        </div>
      </div>

      {isValid && (
        <Button size="l" color="primary" fullWidth onClick={handleSave} className={styles.saveBtn}>
          Сохранить
        </Button>
      )}
    </div>
  );
};

export default CreateExercisePage;