import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/Components/UI/Button/Button';
import { Input } from '@/Components/UI/Input/Input';
import styles from './Styles.module.scss';
import searchIcon from "/icons/Search.svg";
import cn from 'classnames';
import ExerciseCard from '@/Components/Common/ExerciseCard/ExerciseCard';
import ExerciseModal from '@/Components/Modals/ExerciseModal/ExerciseModal';
import { useAuth } from '@/Auth';
import { useExercisesQuery } from '@/hooks/useExercisesQuery';
import { labelForSecondary, PRIMARY_TO_SECONDARY } from '@/Utils/muscleGroups';
import { filterExercisesByCategory } from '../../exerciseFiltering';

interface Filter {
  id: string;
  label: string;
}

interface Exercise {
  id: string;
  name: string;
  secondary_muscles: string[];
  equipment?: string | null;
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

  // Модалка
  const [modalExercise, setModalExercise] = useState<Exercise | null>(null);

  const groupName = groupId ? groupNames[groupId] || 'Упражнения' : 'Упражнения';

  const filters: Filter[] = useMemo(() => {
    const keys = PRIMARY_TO_SECONDARY[groupId ?? ''] ?? [];
    return keys.map(k => ({ id: k, label: labelForSecondary(k) }));
  }, [groupId]);

  useEffect(() => {
    setSelectedFilters([]);
  }, [groupId]);

  const groupExercises = filterExercisesByCategory(allExercises, groupId || '', user?.id ?? null);

  const filteredExercises = groupExercises.filter(ex => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesName = ex.name.toLowerCase().includes(q);
      const matchesSecondary = ex.secondary_muscles.some(m => labelForSecondary(m).toLowerCase().includes(q));
      const matchesEquipment = ex.equipment?.toLowerCase().includes(q);
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

  const currentGroupSelected = allSelectedExercises[groupId || ''] || [];

  const handleToggleFilter = (filterId: string) => {
    setSelectedFilters(prev =>
      prev.includes(filterId) ? prev.filter(id => id !== filterId) : [...prev, filterId]
    );
  };

  const handleToggleExercise = (exerciseId: string) => {
    setAllSelectedExercises(prev => {
      const groupExercises = prev[groupId || ''] || [];
      const newGroupExercises = groupExercises.includes(exerciseId)
        ? groupExercises.filter(id => id !== exerciseId)
        : [...groupExercises, exerciseId];

      return {
        ...prev,
        [groupId || '']: newGroupExercises,
      };
    });
  };

  const handleExerciseClick = (exercise: Exercise) => {
    setModalExercise(exercise);
  };

  const handleBack = () => {
    navigate('/add', {
      state: {
        returnedGroupId: groupId,
        selectedExercises: allSelectedExercises,
        activeTab: 'exercises',
        exerciseSearchQuery: searchQuery,
      },
    });
  };

  const handleCreateExercise = () => {
    console.log('Создать упражнение');
  };

  const handleModalConfirm = (sets: { weight: number; reps: number }[], description: string) => {
    console.log('Сохранено:', { sets, description, exercise: modalExercise });
    if (modalExercise) {
      handleToggleExercise(modalExercise.id);
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
            <div className={styles.searchWrapper}>
              <Input
                type="text"
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Поиск"
                className={styles.searchInput}
              />
              <img src={searchIcon} alt="поиск" className={styles.searchIcon} />
            </div>
            <Button size="s" color="primary" onClick={handleCreateExercise} className={styles.addButton}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Создать упражнение
            </Button>
          </div>

          {filters.length > 0 && (
            <div className={styles.filtersWrapper}>
              <div className={styles.filters}>
                {filters.map(filter => (
                  <button
                    key={filter.id}
                    className={cn(styles.filter, selectedFilters.includes(filter.id) && styles.filterActive)}
                    onClick={() => handleToggleFilter(filter.id)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={styles.exercisesList}>
          {filteredExercises.length > 0 ? (
            filteredExercises.map(exercise => (
              <ExerciseCard
                key={exercise.id}
                id={exercise.id}
                name={exercise.name}
                targetMuscles={exercise.secondary_muscles.map(labelForSecondary)}
                equipment={exercise.equipment ? [exercise.equipment] : []}
                onToggle={handleToggleExercise}
                isSelected={currentGroupSelected.includes(exercise.id)}
                onClick={() => handleExerciseClick(exercise)}
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
          muscleGroup={groupId || ''}
          targetMuscles={modalExercise.secondary_muscles.map(labelForSecondary)}
          equipment={modalExercise.equipment ? [modalExercise.equipment] : []}
          description=""
          onConfirm={handleModalConfirm}
        />
      )}
    </div>
  );
};

export default ExerciseSelectPage;