import { memo, useState } from 'react';
import styles from './Styles.module.scss';
import cn from 'classnames';
import { MuscleGroupBadge } from '@/Components/Common/MuscleGroupBadge/MuscleGroupBadge';

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
  const [isLiked, setIsLiked] = useState(false);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiked(prev => !prev);
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