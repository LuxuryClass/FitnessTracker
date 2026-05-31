import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/Components/UI/Button/Button';
import styles from './Styles.module.scss';
import cn from 'classnames';
import ExerciseCard from '@/Components/Common/ExerciseCard/ExerciseCard';
import ExerciseModal from '@/Components/Modals/ExerciseModal/ExerciseModal';
import { useAuth } from '@/Auth';
import { ApiError, authApi, type Exercise as ApiExercise } from '@/Auth/authApi';
import { useAuthenticatedCall } from '@/hooks/useAuthenticatedCall';
import { useExercisesQuery } from '@/hooks/useExercisesQuery';
import { labelForSecondary, labelForPrimary, PRIMARY_TO_SECONDARY } from '@/Utils/muscleGroups';
import { filterExercisesByCategory } from '../../exerciseFiltering';
import type { ExerciseSet } from '@/Auth/authApi';
import type { WorkoutFormSettings } from '../../CreateWorkoutPage';
import { SearchBar } from '@/Components/UI/Search/Search';

interface Filter {
  id: string;
  label: string;
}

interface Exercise {
  id: string;
  name: string;
  created_by_user_id: string | null;
  primary_muscle_groups: string[];
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
  const [pendingMedia, setPendingMedia] = useState<{
    exerciseId: string;
    url: string;
    type: 'image' | 'video';
  } | null>(null);
  const pendingMediaRef = useRef<typeof pendingMedia>(null);
  pendingMediaRef.current = pendingMedia;

  useEffect(() => {
    return () => {
      if (pendingMediaRef.current) {
        URL.revokeObjectURL(pendingMediaRef.current.url);
      }
    };
  }, []);

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

  const clearPendingMedia = () => {
    setPendingMedia(prev => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
  };

  const handleUploadMedia = (file: File): void => {
    if (!modalExercise) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      alert('Разрешены только изображения и видео.');
      return;
    }
    if (isImage && file.size > MAX_IMAGE_SIZE_BYTES) {
      alert('Размер изображения не должен превышать 5 MB.');
      return;
    }
    if (isVideo && file.size > MAX_VIDEO_SIZE_BYTES) {
      alert('Размер видео не должен превышать 50 MB.');
      return;
    }

    const exerciseId = modalExercise.id;
    setPendingMedia(prev => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { exerciseId, url: URL.createObjectURL(file), type: isVideo ? 'video' : 'image' };
    });
    setIsMediaUploading(true);

    void (async () => {
      try {
        const updated = await callWithAuth(token => authApi.uploadExerciseMedia(token, exerciseId, file));
        applyUpdatedExercise(updated);
      } catch (error) {
        alert(error instanceof ApiError ? error.message : 'Не удалось загрузить медиа. Попробуйте позже.');
      } finally {
        clearPendingMedia();
        setIsMediaUploading(false);
      }
    })();
  };

  const handleDeleteMedia = (): void => {
    if (!modalExercise) return;

    const exerciseId = modalExercise.id;
    clearPendingMedia();
    setIsMediaUploading(true);

    void (async () => {
      try {
        const updated = await callWithAuth(token => authApi.deleteExerciseMedia(token, exerciseId));
        applyUpdatedExercise(updated);
      } catch (error) {
        alert(error instanceof ApiError ? error.message : 'Не удалось удалить медиа. Попробуйте позже.');
      } finally {
        setIsMediaUploading(false);
      }
    })();
  };

  const getModalImageUrl = (): string | undefined => {
    if (!modalExercise) return undefined;
    if (pendingMedia && pendingMedia.exerciseId === modalExercise.id) {
      return pendingMedia.type === 'image' ? pendingMedia.url : undefined;
    }
    return modalExercise.media_type === 'image' ? modalExercise.media_url ?? undefined : undefined;
  };

  const getModalVideoUrl = (): string | undefined => {
    if (!modalExercise) return undefined;
    if (pendingMedia && pendingMedia.exerciseId === modalExercise.id) {
      return pendingMedia.type === 'video' ? pendingMedia.url : undefined;
    }
    return modalExercise.media_type === 'video' ? modalExercise.media_url ?? undefined : undefined;
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
                muscleGroups={exercise.primary_muscle_groups.map(labelForPrimary)}
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
          muscleGroups={modalExercise.primary_muscle_groups.map(labelForPrimary)}
          targetMuscles={modalExercise.secondary_muscles.map(labelForSecondary)}
          equipment={modalExercise.equipment ? [modalExercise.equipment] : []}
          description=""
          sets={exerciseSets[modalExercise.id]}
          imageUrl={getModalImageUrl()}
          videoUrl={getModalVideoUrl()}
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