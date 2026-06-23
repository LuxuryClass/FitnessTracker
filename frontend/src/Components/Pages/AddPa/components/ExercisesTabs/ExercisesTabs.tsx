import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/Components/UI/Button/Button';
import styles from './Styles.module.scss';
import { MuscleGroupCard } from '@/Components/Common/MuscleGroupCard/MuscleGroupCard';
import { useAuth } from '@/Auth';
import { useExercisesQuery } from '@/hooks/useExercisesQuery';
import { filterExercisesByCategory } from '../../exerciseFiltering';
import type { ExerciseSet } from '@/Auth/authApi';
import type { WorkoutFormSettings } from '../../CreateWorkoutPage';
import { SearchBar } from '@/Components/UI/Search/Search';

interface MuscleGroup {
  id: string;
  name: string;
  icon: string;
}

interface ExercisesTabsProps {
  selectedExercises?: Record<string, string[]>;
  exerciseSets?: Record<string, ExerciseSet[]>;
  formSettings?: WorkoutFormSettings;
  onExercisesChange?: (updater: (prev: Record<string, string[]>) => Record<string, string[]>) => void;
  initialSearchQuery?: string;
  onSearchQueryChange?: (value: string) => void;
  browseMode?: boolean;
  sessionMode?: boolean;
  sessionWorkoutId?: string;
}

const ExercisesTabs = ({
  selectedExercises = {},
  exerciseSets = {},
  formSettings,
  /*onExercisesChange*/
  initialSearchQuery = '',
  onSearchQueryChange,
  browseMode = false,
  sessionMode = false,
  sessionWorkoutId,
}: ExercisesTabsProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const { user } = useAuth();
  const { data: exercises = [] } = useExercisesQuery();

  // Подхватываем запрос, прокинутый сверху (после возврата с /exercises/:groupId).
  useEffect(() => {
    setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearchQueryChange?.(value);
  };

  const muscleGroups: MuscleGroup[] = [
    { id: 'chest', name: 'Грудь', icon: '/icons/chest.svg' },
    { id: 'back', name: 'Спина', icon: '/icons/back.svg' },
    { id: 'legs', name: 'Ноги', icon: '/icons/legs.svg' },
    { id: 'shoulders', name: 'Плечи', icon: '/icons/shoulders.svg' },
    { id: 'arms', name: 'Руки', icon: '/icons/arms.svg' },
    { id: 'core', name: 'Корпус', icon: '/icons/abs.svg' },
    { id: 'cardio', name: 'Кардио', icon: '/icons/cardio.svg' },
    { id: 'myself', name: 'Личные', icon: '/icons/personal.svg' },
  ];

  // Поиск идёт только по названию упражнений. Категория показывается, если в ней
  // есть хотя бы одно совпавшее упражнение; счётчик отражает число совпадений.
  const trimmedQuery = searchQuery.trim().toLowerCase();
  const getMatchingExercises = (groupId: string) => {
    const inCategory = filterExercisesByCategory(exercises, groupId, user?.id ?? null);
    if (!trimmedQuery) return inCategory;
    return inCategory.filter(e => e.name.toLowerCase().includes(trimmedQuery));
  };

  const filteredGroups = trimmedQuery
    ? muscleGroups.filter(group => getMatchingExercises(group.id).length > 0)
    : muscleGroups;

  const getExercisesCount = (groupId: string) => getMatchingExercises(groupId).length;

  const getSelectedCount = (groupId: string) => {
    return selectedExercises[groupId]?.length || 0;
  };

const handleCardClick = (group: MuscleGroup) => {
  if (browseMode) {
    navigate(`/exercises/${group.id}`, {
      state: {
        muscleGroup: group,
        browseMode: true,
        exerciseSearchQuery: searchQuery,
      }
    });
    return;
  }
  if (sessionMode) {
    navigate(`/exercises/${group.id}`, {
      state: {
        muscleGroup: group,
        currentSelectedExercises: selectedExercises,
        currentExerciseSets: exerciseSets,
        exerciseSearchQuery: searchQuery,
        isSessionMode: true,
        sessionWorkoutId,
      }
    });
    return;
  }
  // Сохраняем снимок выбранных упражнений перед переходом
  navigate(`/exercises/${group.id}`, {
    state: {
      muscleGroup: group,
      currentSelectedExercises: selectedExercises,
      currentExerciseSets: exerciseSets,
      currentFormSettings: formSettings,
      exerciseSearchQuery: searchQuery,
      exercisesSnapshot: selectedExercises, // ← снимок
    }
  });
};
  const handleCreateExercise = () => {
    navigate("/createExercise");
  };

  return (
    <div className={styles.page}>
<div className={styles.searchRow}>
  <SearchBar
    value={searchQuery} 
    onChange={handleSearchChange} 
    placeholder="Поиск"
    className={styles.search}
  />
  <Button 
    size="s" 
    color="primary" 
    onClick={handleCreateExercise}
    className={styles.addButton}
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
    Создать упражнение
  </Button>
</div>

      <div className={styles.grid}>
        {filteredGroups.map(group => (
          <MuscleGroupCard
            key={group.id}
            name={group.name}
            icon={group.icon}
            exercisesCount={getExercisesCount(group.id)}
            selectedCount={browseMode ? 0 : getSelectedCount(group.id)}
            onClick={() => handleCardClick(group)}
          />
        ))}
      </div>
    </div>
  );
};

export default ExercisesTabs;