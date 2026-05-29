import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/Components/UI/Button/Button';
import { Input } from '@/Components/UI/Input/Input';
import styles from './Styles.module.scss';
import searchIcon from "/icons/Search.svg";
import cn from 'classnames';
import ExerciseCard from '@/Components/Common/ExerciseCard/ExerciseCard';
import ExerciseModal from '@/Components/Modals/ExerciseModal/ExerciseModal';
import { useAuth } from '@/Auth';
import { ApiError, authApi, type Exercise as ApiExercise } from '@/Auth/authApi';
import { useAuthenticatedCall } from '@/hooks/useAuthenticatedCall';
import { useExercisesQuery } from '@/hooks/useExercisesQuery';
import { labelForSecondary, PRIMARY_TO_SECONDARY } from '@/Utils/muscleGroups';
import { filterExercisesByCategory } from '../../exerciseFiltering';
import type { ExerciseSet } from '@/Auth/authApi';
import type { WorkoutFormSettings } from '../../CreateWorkoutPage';

interface Filter {
  id: string;
  label: string;
}

interface Exercise {
  id: string;
  name: string;
  created_by_user_id: string | null;
  secondary_muscles: string[];
  equipment?: string | null;
  media_url: string | null;
  media_type: 'image' | 'video' | null;
}

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;

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
  const callWithAuth = useAuthenticatedCall();
  const queryClient = useQueryClient();
  const { data: allExercises = [] } = useExercisesQuery();

  const [isMediaUploading, setIsMediaUploading] = useState(false);

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
    navigate('/add', {
      state: {
        returnedGroupId: groupId,
        selectedExercises: allSelectedExercises,
        exerciseSets,
        formSettings,
        activeTab: 'exercises',
        exerciseSearchQuery: searchQuery,
      },
    });
  };

  const handleCreateExercise = () => {
    console.log('Создать упражнение');
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

  // Патчим закэшированный список упражнений свежим объектом из ответа сервера.
  const applyUpdatedExercise = (updated: ApiExercise) => {
    queryClient.setQueryData<ApiExercise[]>(['exercises', user?.id], prev =>
      prev ? prev.map(ex => (ex.id === updated.id ? updated : ex)) : prev,
    );
    setModalExercise(prev =>
      prev && prev.id === updated.id
        ? { ...prev, media_url: updated.media_url, media_type: updated.media_type }
        : prev,
    );
  };

  const handleUploadMedia = async (file: File): Promise<boolean> => {
    if (!modalExercise) return false;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      alert('Разрешены только изображения и видео.');
      return false;
    }
    if (isImage && file.size > MAX_IMAGE_SIZE_BYTES) {
      alert('Размер изображения не должен превышать 5 MB.');
      return false;
    }
    if (isVideo && file.size > MAX_VIDEO_SIZE_BYTES) {
      alert('Размер видео не должен превышать 50 MB.');
      return false;
    }

    const exerciseId = modalExercise.id;
    setIsMediaUploading(true);
    try {
      const updated = await callWithAuth(token => authApi.uploadExerciseMedia(token, exerciseId, file));
      applyUpdatedExercise(updated);
      return true;
    } catch (error) {
      alert(error instanceof ApiError ? error.message : 'Не удалось загрузить медиа. Попробуйте позже.');
      return false;
    } finally {
      setIsMediaUploading(false);
    }
  };

  const handleDeleteMedia = async (): Promise<boolean> => {
    if (!modalExercise) return false;

    const exerciseId = modalExercise.id;
    setIsMediaUploading(true);
    try {
      const updated = await callWithAuth(token => authApi.deleteExerciseMedia(token, exerciseId));
      applyUpdatedExercise(updated);
      return true;
    } catch (error) {
      alert(error instanceof ApiError ? error.message : 'Не удалось удалить медиа. Попробуйте позже.');
      return false;
    } finally {
      setIsMediaUploading(false);
    }
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
                isSelected={isExerciseSelected(exercise.id)}
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
          sets={exerciseSets[modalExercise.id]}
          imageUrl={modalExercise.media_type === 'image' ? modalExercise.media_url ?? undefined : undefined}
          videoUrl={modalExercise.media_type === 'video' ? modalExercise.media_url ?? undefined : undefined}
          canEditMedia={!!user && modalExercise.created_by_user_id === user.id}
          isMediaUploading={isMediaUploading}
          onUploadMedia={handleUploadMedia}
          onDeleteMedia={handleDeleteMedia}
          onConfirm={handleModalConfirm}
        />
      )}
    </div>
  );
};

export default ExerciseSelectPage;