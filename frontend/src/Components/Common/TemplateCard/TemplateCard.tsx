import { memo, useState } from 'react';
import styles from './Styles.module.scss';
import cn from 'classnames';
import { MuscleGroupBadge } from '@/Components/Common/MuscleGroupBadge/MuscleGroupBadge';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/Auth';
import { authApi, type WorkoutTemplate } from '@/Auth/authApi';
import { useAuthenticatedCall } from '@/hooks/useAuthenticatedCall';

interface TemplateCardProps {
  template: any;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onArrowClick?: (template: any) => void;
  showArrow?: boolean;
  className?: string;
}

const TemplateCardComponent = ({
  template,
  isSelected,
  onSelect,
  onArrowClick,
  showArrow = true,
  className,
}: TemplateCardProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const callWithAuth = useAuthenticatedCall();
  const [isLiked, setIsLiked] = useState<boolean>(!!template.isFavorite);
  const [isPending, setIsPending] = useState(false);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPending) return;

    const next = !isLiked;
    setIsLiked(next);
    setIsPending(true);

    const queryKey = ['workoutTemplates', user?.id];
    queryClient.setQueryData<WorkoutTemplate[]>(queryKey, (prev) =>
      prev?.map((t) => (t.id === template.id ? { ...t, is_favorite: next } : t)),
    );

    try {
      await callWithAuth((token) =>
        next
          ? authApi.addWorkoutTemplateFavorite(token, template.id)
          : authApi.removeWorkoutTemplateFavorite(token, template.id),
      );
    } catch {
      setIsLiked(!next);
      queryClient.setQueryData<WorkoutTemplate[]>(queryKey, (prev) =>
        prev?.map((t) => (t.id === template.id ? { ...t, is_favorite: !next } : t)),
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div
      className={cn(
        styles.card,
        isSelected && styles.cardSelected,
        className
      )}
      onClick={() => onSelect(template.id)}
    >
      <div className={styles.content}>
        <h3 className={cn(styles.title, isSelected && styles.titleSelected)}>
          {template.title}
        </h3>
        <p className={cn(styles.description, isSelected && styles.descriptionSelected)}>
          {template.description}
        </p>
        <MuscleGroupBadge
          groups={template.muscleGroups}
          primaryGroups={template.primaryGroups}
          type="block"
        />
      </div>

      <div className={styles.rightCol}>
        <button
          className={cn(styles.likeBtn, isLiked && styles.likeBtn_active)}
          onClick={handleLike}
          aria-label="Нравится"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'}>
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {showArrow && (
          <button
            className={styles.arrow}
            onClick={(e) => {
              e.stopPropagation();
              onArrowClick?.(template);
            }}
            aria-label="Перейти к шаблону"
          >
            <span className={styles.arrowIcon}>›</span>
          </button>
        )}

        {template.savedAt && (
          <span className={styles.date}>{formatDate(template.savedAt)}</span>
        )}
      </div>
    </div>
  );
};

export const TemplateCard = memo(TemplateCardComponent);