import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Styles.module.scss';
import cn from 'classnames';
import { MuscleGroupBadge } from '@/Components/Common/MuscleGroupBadge/MuscleGroupBadge';

interface TemplateCardProps {
  id: string;
  title: string;
  description: string;
  muscleGroups: string[];
  primaryGroups?: string[];
  savedAt?: string;
  className?: string;
  onSelect?: (id: string) => void;
  isSelected?: boolean;
}

const TemplateCardComponent = ({
  id,
  title,
  description,
  muscleGroups,
  primaryGroups = [],
  className,
  onSelect,
  isSelected = false,
}: TemplateCardProps) => {
  const navigate = useNavigate();

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest(`.${styles.arrow}`)) return;
    onSelect?.(id);
  };

  const handleArrowClick = () => {
    navigate(`/template/${id}`);
  };

  return (
    <div
      className={cn(
        styles.card,
        isSelected && styles.cardSelected,
        className
      )}
      onClick={handleCardClick}
    >
      <div className={styles.content}>
        <div className={styles.topRow}>
          <h3 className={cn(styles.title, isSelected && styles.titleSelected)}>
            {title}
          </h3>
        </div>
        <p className={cn(styles.description, isSelected && styles.descriptionSelected)}>
          {description}
        </p>
        <MuscleGroupBadge
          groups={muscleGroups}
          primaryGroups={primaryGroups}
          type="block"
        />
      </div>
      <button
        className={styles.arrow}
        onClick={handleArrowClick}
        aria-label="Перейти к шаблону"
      >
        <span className={styles.arrowIcon}>›</span>
      </button>
    </div>
  );
};

export const TemplateCard = memo(TemplateCardComponent);