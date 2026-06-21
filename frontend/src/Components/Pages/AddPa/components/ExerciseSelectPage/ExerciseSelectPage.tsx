import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/Components/UI/Button/Button';
import styles from './Styles.module.scss';
import ExerciseCard from '@/Components/Common/ExerciseCard/ExerciseCard';
import ExerciseModal from '@/Components/Modals/ExerciseModal/ExerciseModal';
import { useAuth } from '@/Auth';
import { useExercisesQuery } from '@/hooks/useExercisesQuery';
import { labelForSecondary, labelForPrimary, PRIMARY_TO_SECONDARY } from '@/Utils/muscleGroups';
import { filterExercisesByCategory } from '../../exerciseFiltering';
import type { ExerciseSet } from '@/Auth/authApi';
import type { WorkoutFormSettings } from '../../CreateWorkoutPage';
import { SearchBar } from '@/Components/UI/Search/Search';
import { MuscleGroupBadge } from '@/Components/Common/MuscleGroupBadge/MuscleGroupBadge';

interface Filter {
  id: string;
  label: string;
}

interface ExerciseMediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
}

interface Exercise {
  id: string;
  name: string;
  created_by_user_id: string | null;
  primary_muscle_groups: string[];
  secondary_muscles: string[];
  equipment: string[];
  media: ExerciseMediaItem[];
}

const groupNames: Record<string, string> = {
  chest: 'Грудь',
  back: 'Спина',
  legs: 'Ноги',
  shoulders: 'Плечи',
  arms: 'Руки',
  core: 'Корпус',
  cardio: 'Кардио',
  myself: 'Личные',
};

const ExerciseSelectPage = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { data: allExercises = [] } = useExercisesQuery();

  const initialSearchQuery = (location.state as any)?.exerciseSearchQuery ?? '';

  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  const [allSelectedExercises, setAllSelectedExercises] = useState<Record<string, string[]>>(() => {
    return (location.state as any)?.currentSelectedExercises || {};
  });

  // Подходы по упражнениям (ключ — id упражнения).
  const [exerciseSets, setExerciseSets] = useState<Record<string, ExerciseSet[]>>(() => {
    return (location.state as any)?.currentExerciseSets || {};
  });

  const formSettings = (location.state as any)?.currentFormSettings as WorkoutFormSettings | undefined;

  // Модалка
  const [modalExercise, setModalExercise] = useState<Exercise | null>(null);

  const groupName = groupId ? groupNames[groupId] || 'Упражнения' : 'Упражнения';

  const filters: Filter[] = useMemo(() => {
    const keys = PRIMARY_TO_SECONDARY[groupId ?? ''] ?? [];
    return keys
      .map(k => ({ id: k, label: labelForSecondary(k) }))
      // Прячем чип, дублирующий название категории (напр. «Спина» в категории «Спина»).
      .filter(f => f.label !== groupName);
  }, [groupId, groupName]);

  useEffect(() => {
    setSelectedFilters([]);
  }, [groupId]);

  const isSessionMode = (location.state as any)?.isSessionMode || false;

  const groupExercises = useMemo(() => {
    if (isSessionMode) {
      return allExercises;
    }
    return filterExercisesByCategory(allExercises, groupId || '', user?.id ?? null);
  }, [allExercises, groupId, user, isSessionMode]);

  const filteredExercises = groupExercises.filter(ex => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesName = ex.name.toLowerCase().includes(q);
      const matchesSecondary = ex.secondary_muscles.some(m => labelForSecondary(m).toLowerCase().includes(q));
      const matchesEquipment = ex.equipment.some(e => e.toLowerCase().includes(q));
      if (!(matchesName || matchesSecondary || matchesEquipment)) return false;
    }

    if (selectedFilters.length > 0) {
      const matchesAnyFilter = selectedFilters.some(filterKey =>
        ex.secondary_muscles.includes(filterKey)
      );
      if (!matchesAnyFilter) return false;
    }

    return true;
  });

  // Выбор упражнения единый: id отмечен, если он выбран в любой группе.
  const isExerciseSelected = (exerciseId: string) =>
    Object.values(allSelectedExercises).some(ids => ids.includes(exerciseId));

  const handleToggleFilter = (filterId: string) => {
    setSelectedFilters(prev =>
      prev.includes(filterId) ? prev.filter(id => id !== filterId) : [...prev, filterId]
    );
  };

  const handleToggleExercise = (exerciseId: string) => {
    setAllSelectedExercises(prev => {
      const isRemoving = Object.values(prev).some(ids => ids.includes(exerciseId));

      if (isRemoving) {
        // Снятие выбора убирает упражнение из всех групп — выбор единый.
        const next: Record<string, string[]> = {};
        for (const [group, ids] of Object.entries(prev)) {
          next[group] = ids.filter(id => id !== exerciseId);
        }
        setExerciseSets(prevSets => {
          if (!(exerciseId in prevSets)) return prevSets;
          const { [exerciseId]: _removed, ...rest } = prevSets;
          return rest;
        });
        return next;
      }

      // Добавляем в текущую группу.
      const groupExercises = prev[groupId || ''] || [];
      return {
        ...prev,
        [groupId || '']: [...groupExercises, exerciseId],
      };
    });
  };

  const handleExerciseClick = (exercise: Exercise) => {
    setModalExercise(exercise);
  };

  const handleBack = () => {
    const state = location.state as any;
    const isSessionMode = state?.isSessionMode || false;

    if (isSessionMode) {
      navigate(`/session/${state.sessionWorkoutId}`, {
        state: {
          selectedExercises: allSelectedExercises,
        },
      });
    } else {
      navigate('/add', {
        state: {
          returnedGroupId: groupId,
          selectedExercises: allSelectedExercises,
          exerciseSets,
          formSettings,
          activeTab: 'exercises',
          exerciseSearchQuery: searchQuery,
          exercisesSnapshot: state?.exercisesSnapshot,
        },
      });
    }
  };

  const handleCreateExercise = () => {
    navigate("/createExercise");
  };

  const handleModalConfirm = (sets: ExerciseSet[], _description: string) => {
    if (modalExercise) {
      const id = modalExercise.id;
      setExerciseSets(prev => ({ ...prev, [id]: sets }));
      // Подтверждение модалки всегда выбирает упражнение (не тоглит).
      if (!isExerciseSelected(id)) {
        setAllSelectedExercises(prev => ({
          ...prev,
          [groupId || '']: [...(prev[groupId || ''] || []), id],
        }));
      }
    }
    setModalExercise(null);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button size="back" onClick={handleBack} />
        <h1 className={styles.title}>{groupName}</h1>
      </div>

      <div className={styles.content}>
        <div className={styles.content__header}>
          <div className={styles.searchRow}>
              <SearchBar
                value={searchQuery} 
                onChange={setSearchQuery} 
                placeholder="Поиск"
                className={styles.search}
              />
            <Button size="s" color="primary" onClick={handleCreateExercise} className={styles.addButton}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Создать упражнение
            </Button>
          </div>

          {filters.length > 0 && (
            <MuscleGroupBadge
              type="filter"
              groups={filters.map(f => f.label)} 
              primaryGroups={selectedFilters.map(id => {
                const f = filters.find(x => x.id === id);
                return f?.label ?? '';
              })}
              onToggle={(label) => {
                const filter = filters.find(f => f.label === label);
                if (filter) handleToggleFilter(filter.id);
              }}
            />
          )}
        </div>

        <div className={styles.exercisesList}>
          {filteredExercises.length > 0 ? (
            filteredExercises.map(exercise => (
<ExerciseCard
  key={exercise.id}
  id={exercise.id}
  name={exercise.name}
  muscleGroups={exercise.primary_muscle_groups.map(labelForPrimary)}
  targetMuscles={exercise.secondary_muscles.map(labelForSecondary)}
  equipment={exercise.equipment}
  imageUrl={exercise.media.find(m => m.type === 'image')?.url}
  onToggle={handleToggleExercise}
  onArrowClick={(id) => {
    const ex = filteredExercises.find(e => e.id === id);
    if (ex) handleExerciseClick(ex);
  }}
  isSelected={isExerciseSelected(exercise.id)}
/>
            ))
          ) : (
            <div className={styles.emptyState}>
              <p className={styles.empty}>
                {searchQuery || selectedFilters.length > 0 ? 'Упражнения не найдены' : 'Список упражнений появится здесь'}
              </p>
            </div>
          )}
        </div>
      </div>

      {modalExercise && (
        <ExerciseModal
          isOpen={!!modalExercise}
          onClose={() => setModalExercise(null)}
          name={modalExercise.name}
          muscleGroups={modalExercise.primary_muscle_groups.map(labelForPrimary)}
          targetMuscles={modalExercise.secondary_muscles.map(labelForSecondary)}
          equipment={modalExercise.equipment}
          description=""
          sets={exerciseSets[modalExercise.id]}
          media={modalExercise.media}
          onConfirm={handleModalConfirm}
        />
      )}
    </div>
  );
};

export default ExerciseSelectPage;