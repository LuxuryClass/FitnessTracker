import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/Components/UI/Button/Button';
import { TemplateCard } from '@/Components/Common/TemplateCard/TemplateCard';
import styles from './Styles.module.scss';
import cn from 'classnames';
import { ConfirmTemplateModal } from '@/Components/Modals/ConfirmTemplateModal/ConfirmTemplateModal';
import { useWorkoutTemplatesQuery } from '@/hooks/useWorkoutTemplatesQuery';
import { useExercisesQuery } from '@/hooks/useExercisesQuery';
import { labelForPrimary } from '@/Utils/muscleGroups';

interface TemplateExercise {
  exerciseId: string;
}

export interface Template {
  id: string;
  title: string;
  description: string;
  muscleGroups: string[];
  primaryGroups?: string[];
  savedAt: string;
  equipment: string[];
  isFavorite: boolean;
  isSystem: boolean;
  exercises: TemplateExercise[];
}

const SORT_OPTIONS = ['дате', 'названию', 'упражнениям'];

const TemplatesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const passedHasData = (location.state as any)?.hasData as boolean;
  const [sortBy, setSortBy] = useState('дате');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const hasExistingData = (location.state as any)?.hasData as boolean;
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<Template | null>(null);

  const { data: apiTemplates = [], isPending } = useWorkoutTemplatesQuery();
  const { data: catalog = [] } = useExercisesQuery();

  const catalogById = useMemo(() => {
    const map = new Map<string, (typeof catalog)[number]>();
    for (const ex of catalog) map.set(ex.id, ex);
    return map;
  }, [catalog]);

  const templates = useMemo<Template[]>(() => {
    return apiTemplates.map((t) => {
      const primarySlugs: string[] = [];
      const seenPrimary = new Set<string>();
      const equipment: string[] = [];
      const seenEquipment = new Set<string>();

      for (const te of t.exercises) {
        const info = catalogById.get(te.exercise_id);
        if (!info) continue;
        for (const g of info.primary_muscle_groups) {
          if (!seenPrimary.has(g)) {
            seenPrimary.add(g);
            primarySlugs.push(g);
          }
        }
        for (const eq of info.equipment) {
          if (!seenEquipment.has(eq)) {
            seenEquipment.add(eq);
            equipment.push(eq);
          }
        }
      }

      const muscleGroups = primarySlugs.map(labelForPrimary);

      return {
        id: t.id,
        title: t.title,
        description: t.description ?? '',
        muscleGroups,
        primaryGroups: muscleGroups,
        savedAt: t.created_at,
        equipment,
        isFavorite: t.is_favorite,
        isSystem: t.created_by_user_id === null,
        exercises: t.exercises.map((te) => ({ exerciseId: te.exercise_id })),
      };
    });
  }, [apiTemplates, catalogById]);

  const sortedTemplates = useMemo(() => {
    const list = [...templates];
    switch (sortBy) {
      case 'дате':
        return list.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
      case 'названию':
        return list.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
      case 'упражнениям':
        return list.sort((a, b) => b.exercises.length - a.exercises.length);
      default:
        return list;
    }
  }, [sortBy, templates]);

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
        hasData: passedHasData,
      },
    });
  };

  const handleAdd = () => {
    if (selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId);
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
        {isPending ? (
          <p className={styles.emptyState}>Загрузка...</p>
        ) : sortedTemplates.length === 0 ? (
          <p className={styles.emptyState}>Шаблонов пока нет</p>
        ) : (
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
        )}
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