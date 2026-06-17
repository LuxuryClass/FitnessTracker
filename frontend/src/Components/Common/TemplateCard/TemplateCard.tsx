import { memo } from 'react';
import styles from './Styles.module.scss';
import cn from 'classnames';
import { MuscleGroupBadge } from '@/Components/Common/MuscleGroupBadge/MuscleGroupBadge';

interface TemplateCardProps {
  template: any; // заменим на тип позже
  isSelected: boolean;
  onSelect: (id: string) => void;
  onArrowClick: (template: any) => void;
  className?: string;
}

const TemplateCardComponent = ({
  template,
  isSelected,
  onSelect,
  onArrowClick,
  className,
}: TemplateCardProps) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
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
        <div className={styles.topRow}>
          <h3 className={cn(styles.title, isSelected && styles.titleSelected)}>
            {template.title}
          </h3>
          {template.savedAt && (
            <span className={styles.date}>{formatDate(template.savedAt)}</span>
          )}
        </div>
        <p className={cn(styles.description, isSelected && styles.descriptionSelected)}>
          {template.description}
        </p>
        <MuscleGroupBadge
          groups={template.muscleGroups}
          primaryGroups={template.primaryGroups}
          type="block"
        />
      </div>
      <button
        className={styles.arrow}
        onClick={(e) => {
          e.stopPropagation();
          onArrowClick(template);
        }}
        aria-label="Перейти к шаблону"
      >
        <span className={styles.arrowIcon}>›</span>
      </button>
    </div>
  );
};

export const TemplateCard = memo(TemplateCardComponent);