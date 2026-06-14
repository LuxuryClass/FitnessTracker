import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/Components/UI/Button/Button';
import { TemplateCard } from '@/Components/Common/TemplateCard/TemplateCard';
import styles from './Styles.module.scss';
import cn from 'classnames';

// TemplatesPage.tsx — расширенный интерфейс и моки

interface TemplateExercise {
  exerciseId: string;
  sets: { reps: number; weight: number }[];
}

interface Template {
  id: string;
  title: string;
  description: string;
  muscleGroups: string[];
  primaryGroups?: string[];
  savedAt: string;
  notes: string;
  exercises: TemplateExercise[];
}

const MOCK_TEMPLATES: Template[] = [
  {
    id: '1',
    title: 'День груди',
    description: 'Базовые упражнения на грудь',
    muscleGroups: ['Грудь', 'Трицепс'],
    primaryGroups: ['Грудь'],
    savedAt: '2026-06-10',
    notes: 'Работаем на силу, жим 80% от максимума',
    exercises: [
      { exerciseId: 'ex_bench_press', sets: [{ reps: 8, weight: 80 }, { reps: 8, weight: 80 }, { reps: 6, weight: 85 }] },
      { exerciseId: 'ex_incline_dumbbell', sets: [{ reps: 10, weight: 30 }, { reps: 10, weight: 30 }, { reps: 8, weight: 32 }] },
      { exerciseId: 'ex_cable_fly', sets: [{ reps: 12, weight: 20 }, { reps: 12, weight: 20 }, { reps: 15, weight: 15 }] },
      { exerciseId: 'ex_triceps_pushdown', sets: [{ reps: 12, weight: 35 }, { reps: 12, weight: 35 }, { reps: 10, weight: 40 }] },
    ],
  },
  {
    id: '2',
    title: 'День ног',
    description: 'Тяжёлая тренировка ног',
    muscleGroups: ['Ноги', 'Ягодицы'],
    primaryGroups: ['Ноги'],
    savedAt: '2026-06-14',
    notes: 'Приседания в первую очередь, не забыть разминку',
    exercises: [
      { exerciseId: 'ex_squat', sets: [{ reps: 8, weight: 100 }, { reps: 8, weight: 100 }, { reps: 6, weight: 110 }, { reps: 5, weight: 110 }] },
      { exerciseId: 'ex_leg_press', sets: [{ reps: 10, weight: 150 }, { reps: 10, weight: 150 }, { reps: 10, weight: 150 }] },
      { exerciseId: 'ex_romanian_deadlift', sets: [{ reps: 10, weight: 60 }, { reps: 10, weight: 60 }, { reps: 8, weight: 65 }] },
    ],
  },
  {
    id: '3',
    title: 'День спины',
    description: 'Подтягивания и тяги',
    muscleGroups: ['Спина', 'Бицепс'],
    primaryGroups: ['Спина'],
    savedAt: '2026-06-08',
    notes: 'Фокус на ширину спины',
    exercises: [
      { exerciseId: 'ex_pull_up', sets: [{ reps: 10, weight: 0 }, { reps: 8, weight: 0 }, { reps: 8, weight: 0 }] },
      { exerciseId: 'ex_barbell_row', sets: [{ reps: 8, weight: 70 }, { reps: 8, weight: 70 }, { reps: 6, weight: 75 }] },
      { exerciseId: 'ex_lat_pulldown', sets: [{ reps: 12, weight: 55 }, { reps: 12, weight: 55 }, { reps: 10, weight: 60 }] },
      { exerciseId: 'ex_bicep_curl', sets: [{ reps: 12, weight: 15 }, { reps: 12, weight: 15 }, { reps: 10, weight: 17 }] },
    ],
  },
  {
    id: '4',
    title: 'День плеч',
    description: 'Дельты и трапеции',
    muscleGroups: ['Плечи'],
    primaryGroups: ['Плечи'],
    savedAt: '2026-06-12',
    notes: 'Лёгкая тренировка после груди',
    exercises: [
      { exerciseId: 'ex_ohp', sets: [{ reps: 8, weight: 50 }, { reps: 8, weight: 50 }, { reps: 6, weight: 55 }] },
      { exerciseId: 'ex_lateral_raise', sets: [{ reps: 15, weight: 10 }, { reps: 15, weight: 10 }, { reps: 12, weight: 12 }] },
      { exerciseId: 'ex_face_pull', sets: [{ reps: 15, weight: 25 }, { reps: 15, weight: 25 }, { reps: 12, weight: 30 }] },
    ],
  },
  {
    id: '5',
    title: 'Full Body',
    description: 'Тренировка на всё тело',
    muscleGroups: ['Грудь', 'Спина', 'Ноги'],
    primaryGroups: ['Грудь', 'Спина'],
    savedAt: '2026-05-20',
    notes: 'Фулбади для общего тонуса',
    exercises: [
      { exerciseId: 'ex_squat', sets: [{ reps: 10, weight: 80 }, { reps: 10, weight: 80 }, { reps: 8, weight: 85 }] },
      { exerciseId: 'ex_bench_press', sets: [{ reps: 10, weight: 60 }, { reps: 10, weight: 60 }, { reps: 8, weight: 65 }] },
      { exerciseId: 'ex_barbell_row', sets: [{ reps: 10, weight: 60 }, { reps: 10, weight: 60 }, { reps: 8, weight: 65 }] },
      { exerciseId: 'ex_ohp', sets: [{ reps: 10, weight: 40 }, { reps: 10, weight: 40 }, { reps: 8, weight: 45 }] },
    ],
  },
];

const SORT_OPTIONS = ['дате', 'названию', 'упражнениям'];

const TemplatesPage = () => {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState('По дате');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const sortedTemplates = useMemo(() => {
    const templates = [...MOCK_TEMPLATES];
    switch (sortBy) {
      case 'дате':
        return templates.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
      case 'названию':
        return templates.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
      case 'упражнениям':
        return templates.sort((a, b) => b.muscleGroups.length - a.muscleGroups.length);
      default:
        return templates;
    }
  }, [sortBy]);

  const handleSortSelect = (option: string) => {
    setSortBy(option);
    setIsSortOpen(false);
  };

  const handleTemplateSelect = (id: string) => {
    setSelectedTemplateId(prev => prev === id ? null : id);
  };

    const handleAdd = () => {
    if (selectedTemplateId) {
        const template = MOCK_TEMPLATES.find(t => t.id === selectedTemplateId);
        if (template) {
        navigate('/add', {
            state: {
            templateData: {
                workoutName: template.title,
                notes: template.notes,
                selectedTemplate: template.title,
                exercises: template.exercises,
            },
            },
        });
        }
    }
    };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <Button size="back" onClick={() => navigate(-1)} />
        <h1 className={styles.title}>Шаблоны</h1>
      </div>

      {/* Sort */}
      <div className={styles.sortWrapper}>
        <button className={styles.sortButton} onClick={() => setIsSortOpen(!isSortOpen)}>
          <span>Сортировать по: 
            <span className={styles.sortPrimary}>{sortBy}</span>
            </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={cn(styles.sortArrow, isSortOpen && styles.sortArrow_open)}>
            <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {isSortOpen && (
          <div className={styles.sortDropdown}>
            {SORT_OPTIONS.map(option => (
              <button
                key={option}
                className={cn(styles.sortOption, sortBy === option && styles.sortOption_active)}
                onClick={() => handleSortSelect(option)}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Templates */}
      <div className={cn(styles.content, selectedTemplateId && styles.contentActive)}>
        <div className={styles.templateList}>
          {sortedTemplates.map(template => (
            <TemplateCard
              key={template.id}
              id={template.id}
              title={template.title}
              description={template.description}
              muscleGroups={template.muscleGroups}
              primaryGroups={template.primaryGroups}
              savedAt={template.savedAt}
              isSelected={selectedTemplateId === template.id}
              onSelect={handleTemplateSelect}
            />
          ))}
        </div>
      </div>

      {/* Add Button */}
      {selectedTemplateId && (
        <Button size="l" color="primary" fullWidth onClick={handleAdd} className={styles.addBtn}>
          Выбрать
        </Button>
      )}
    </div>
  );
};

export default TemplatesPage;