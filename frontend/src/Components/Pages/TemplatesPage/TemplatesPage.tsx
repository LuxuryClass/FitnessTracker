import { useState, useMemo } from 'react';
import { useNavigate, useLocation} from 'react-router-dom';
import { Button } from '@/Components/UI/Button/Button';
import { TemplateCard } from '@/Components/Common/TemplateCard/TemplateCard';
import styles from './Styles.module.scss';
import cn from 'classnames';
import { ConfirmTemplateModal } from '@/Components/Modals/ConfirmTemplateModal/ConfirmTemplateModal';

interface TemplateExercise {
  exerciseId: string;
  sets: { reps: number; weight: number }[];
}

export interface Template {
  id: string;
  title: string;
  description: string;
  muscleGroups: string[];
  primaryGroups?: string[];
  savedAt: string;
  equipment: string[];
  exercises: TemplateExercise[];
}

const MOCK_TEMPLATES: Template[] = [
  {
    id: '1',
    title: 'День груди',
    description: 'Базовые упражнения на грудь. Работаем на силу, жим 80% от максимума.',
    muscleGroups: ['Грудь', 'Трицепс'],
    primaryGroups: ['Грудь'],
    savedAt: '2026-06-10',
    equipment: ['Штанга', 'Гантели', 'Трос'],
    exercises: [
      { exerciseId: 'e6d530e5-1e94-41c3-8279-451f52c70cb9', sets: [{ reps: 8, weight: 80 }, { reps: 8, weight: 80 }, { reps: 6, weight: 85 }] },
      { exerciseId: 'd94b4711-7a26-4f36-871a-ecfb7eb6614b', sets: [{ reps: 10, weight: 30 }, { reps: 10, weight: 30 }, { reps: 8, weight: 32 }] },
      { exerciseId: '9ae88bac-933c-43c7-9ace-e581f1efc661', sets: [{ reps: 12, weight: 20 }, { reps: 12, weight: 20 }, { reps: 15, weight: 15 }] },
      { exerciseId: '2d61d48f-500b-4f22-b9f0-7d9fd84b7f2c', sets: [{ reps: 12, weight: 35 }, { reps: 12, weight: 35 }, { reps: 10, weight: 40 }] },
    ],
  },
  {
    id: '2',
    title: 'День ног',
    description: 'Тяжёлая тренировка ног. Приседания в первую очередь.',
    muscleGroups: ['Ноги', 'Ягодицы'],
    primaryGroups: ['Ноги'],
    savedAt: '2026-06-14',
    equipment: ['Штанга', 'Тренажёр'],
    exercises: [
      { exerciseId: 'e6d530e5-1e94-41c3-8279-451f52c70cb9', sets: [{ reps: 8, weight: 100 }, { reps: 8, weight: 100 }, { reps: 6, weight: 110 }] },
      { exerciseId: '8439937f-555a-4258-8118-bad396e2811d', sets: [{ reps: 10, weight: 150 }, { reps: 10, weight: 150 }] },
      { exerciseId: 'b6f7ab21-eccb-458c-a5ec-a0964158db6d', sets: [{ reps: 10, weight: 60 }, { reps: 10, weight: 60 }] },
    ],
  },
  {
    id: '3',
    title: 'День спины',
    description: 'Подтягивания и тяги. Фокус на ширину спины.',
    muscleGroups: ['Спина', 'Бицепс'],
    primaryGroups: ['Спина'],
    savedAt: '2026-06-08',
    equipment: ['Турник', 'Штанга', 'Трос', 'Гантели'],
    exercises: [
      { exerciseId: 'd94b4711-7a26-4f36-871a-ecfb7eb6614b', sets: [{ reps: 10, weight: 0 }, { reps: 8, weight: 0 }] },
      { exerciseId: '9ae88bac-933c-43c7-9ace-e581f1efc661', sets: [{ reps: 8, weight: 70 }, { reps: 8, weight: 70 }] },
      { exerciseId: '2d61d48f-500b-4f22-b9f0-7d9fd84b7f2c', sets: [{ reps: 12, weight: 55 }, { reps: 12, weight: 55 }] },
    ],
  },
  {
    id: '4',
    title: 'День плеч',
    description: 'Дельты и трапеции. Лёгкая тренировка после груди.',
    muscleGroups: ['Плечи'],
    primaryGroups: ['Плечи'],
    savedAt: '2026-06-12',
    equipment: ['Штанга', 'Гантели', 'Трос'],
    exercises: [
      { exerciseId: '8439937f-555a-4258-8118-bad396e2811d', sets: [{ reps: 8, weight: 50 }, { reps: 8, weight: 50 }] },
      { exerciseId: 'b6f7ab21-eccb-458c-a5ec-a0964158db6d', sets: [{ reps: 15, weight: 10 }, { reps: 15, weight: 10 }] },
    ],
  },
  {
    id: '5',
    title: 'Full Body',
    description: 'Тренировка на всё тело. Фулбади для общего тонуса.',
    muscleGroups: ['Грудь', 'Спина', 'Ноги'],
    primaryGroups: ['Грудь', 'Спина'],
    savedAt: '2026-05-20',
    equipment: ['Штанга', 'Тренажёр'],
    exercises: [
      { exerciseId: 'e6d530e5-1e94-41c3-8279-451f52c70cb9', sets: [{ reps: 10, weight: 80 }, { reps: 10, weight: 80 }] },
      { exerciseId: 'd94b4711-7a26-4f36-871a-ecfb7eb6614b', sets: [{ reps: 10, weight: 60 }, { reps: 10, weight: 60 }] },
      { exerciseId: '9ae88bac-933c-43c7-9ace-e581f1efc661', sets: [{ reps: 10, weight: 60 }, { reps: 10, weight: 60 }] },
    ],
  },
];

const SORT_OPTIONS = ['дате', 'названию', 'упражнениям'];

const TemplatesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const passedHasData = (location.state as any)?.hasData as boolean;
  const [sortBy, setSortBy] = useState('По дате');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
 
  const hasExistingData = (location.state as any)?.hasData as boolean;
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<Template | null>(null);

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

const handleTemplateArrow = (template: Template) => {
  navigate(`/template/${template.id}`, {
    state: { 
      template,
      hasData: passedHasData,  // ← пробрасываем дальше
    },
  });
};

  const handleAdd = () => {
    if (selectedTemplateId) {
      const template = MOCK_TEMPLATES.find(t => t.id === selectedTemplateId);
      if (!template) return;

      if (hasExistingData) {
        setPendingTemplate(template);
        setShowConfirm(true);
      } else {
        applyTemplate(template);
      }
    }
  };

  const applyTemplate = (template: Template) => {
    navigate('/add', {
      state: {
        templateData: {
          template,
          exercises: template.exercises.map(ex => ({
            exerciseId: ex.exerciseId,
            sets: ex.sets,
          })),
        },
      },
    });
  };

  const handleConfirmReplace = () => {
    setShowConfirm(false);
    if (pendingTemplate) {
      applyTemplate(pendingTemplate);
      setPendingTemplate(null);
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
          <span>
            Сортировать по:{' '}
            <span className={styles.sortPrimary}>{sortBy}</span>
          </span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            className={cn(styles.sortArrow, isSortOpen && styles.sortArrow_open)}
          >
            <path
              d="M6 9L12 15L18 9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
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
              template={template}
              isSelected={selectedTemplateId === template.id}
              onSelect={handleTemplateSelect}
              onArrowClick={handleTemplateArrow}
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

      {showConfirm && (
  <ConfirmTemplateModal
    isOpen={showConfirm}
    onConfirm={handleConfirmReplace}
    onCancel={() => setShowConfirm(false)}
  />
)}
    </div>

    
  );
};

export default TemplatesPage;