import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/Components/UI/Button/Button';
import { Input } from '@/Components/UI/Input/Input';
import styles from './Styles.module.scss';
import searchIcon from "/icons/Search.svg";
import cn from 'classnames';
import ExerciseCard from '@/Components/Common/ExerciseCard/ExerciseCard';
import { useAuth } from '@/Auth';
import { useExercisesQuery } from '@/hooks/useExercisesQuery';
import { filterExercisesByCategory, labelForSecondary } from '../../muscleGroupMapping';

interface Filter {
  id: string;
  label: string;
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

// TODO: подмышечные UI-фильтры пока хардкоженные; синхронизировать с PRIMARY_TO_SECONDARY[groupId].
const getFiltersForGroup = (groupId: string): Filter[] => {
  const filtersByGroup: Record<string, Filter[]> = {
    back: [
      { id: 'lats', label: 'Широчайшие' },
      { id: 'rhomboids', label: 'Ромбовидные' },
      { id: 'trapezius', label: 'Трапеция' },
      { id: 'erectors', label: 'Разгибатели спины' },
    ],
    chest: [
      { id: 'upper', label: 'Верх груди' },
      { id: 'middle', label: 'Средняя часть' },
      { id: 'lower', label: 'Низ груди' },
    ],
    legs: [
      { id: 'quadriceps', label: 'Квадрицепс' },
      { id: 'hamstrings', label: 'Бицепс бедра' },
      { id: 'glutes', label: 'Ягодичные' },
      { id: 'calves', label: 'Икроножные' },
    ],
    shoulders: [
      { id: 'front', label: 'Передняя дельта' },
      { id: 'side', label: 'Средняя дельта' },
      { id: 'rear', label: 'Задняя дельта' },
    ],
    arms: [
      { id: 'biceps', label: 'Бицепс' },
      { id: 'triceps', label: 'Трицепс' },
      { id: 'forearms', label: 'Предплечья' },
    ],
    core: [
      { id: 'rectus', label: 'Прямая мышца' },
      { id: 'obliques', label: 'Косые мышцы' },
      { id: 'transverse', label: 'Поперечная мышца' },
    ],
  };
  return filtersByGroup[groupId] || [];
};

const ExerciseSelectPage = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { data: allExercises = [] } = useExercisesQuery();

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Filter[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  // Инициализируем ОДИН раз при входе на страницу
  const [allSelectedExercises, setAllSelectedExercises] = useState<Record<string, string[]>>(() => {
    return (location.state as any)?.currentSelectedExercises || {};
  });

  const groupName = groupId ? groupNames[groupId] || 'Упражнения' : 'Упражнения';

  useEffect(() => {
    setFilters(getFiltersForGroup(groupId || ''));
    setSelectedFilters([]);
    setSearchQuery('');
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
      // Соответствие любому из выбранных фильтров — по подмышце или подписи.
      const matchesAnyFilter = selectedFilters.every(filterId => {
        const filter = filters.find(f => f.id === filterId);
        if (!filter) return false;
        return ex.secondary_muscles.some(m =>
          m.toLowerCase().includes(filter.id.toLowerCase()) ||
          labelForSecondary(m).toLowerCase().includes(filter.label.toLowerCase())
        );
      });
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

  const handleBack = () => {
    navigate('/add', {
      state: {
        returnedGroupId: groupId,
        selectedExercises: allSelectedExercises,
        activeTab: 'exercises',
      },
    });
  };

  const handleCreateExercise = () => {
    // TODO: модалка/страница создания упражнения через POST /exercises (отдельная итерация).
    console.log('Создать упражнение');
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
    </div>
  );
};

export default ExerciseSelectPage;