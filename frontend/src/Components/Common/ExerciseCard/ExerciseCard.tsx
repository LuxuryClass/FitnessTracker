import { useState } from 'react';
import { MuscleGroupBadge } from '@/Components/Common/MuscleGroupBadge/MuscleGroupBadge';
import styles from './Styles.module.scss';
import cn from 'classnames';

interface ExerciseCardProps {
  id: string;
  name: string;
  muscleGroups?: string[];
  targetMuscles: string[];
  equipment?: string[];
  imageUrl?: string;
  onToggle?: (id: string) => void;
  onArrowClick?: (id: string) => void;
  isSelected?: boolean;
  className?: string;
}

const ExerciseCard = ({
  id,
  name,
  muscleGroups = [],
  targetMuscles,
  equipment = [],
  imageUrl,
  onToggle,
  onArrowClick,
  isSelected = false,
  className
}: ExerciseCardProps) => {
  const [isLiked, setIsLiked] = useState(false);

  const handleCardClick = () => {
    onToggle?.(id);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiked(prev => !prev);
  };

  const handleArrow = (e: React.MouseEvent) => {
    e.stopPropagation();
    onArrowClick?.(id);
  };

  return (
    <div className={cn(styles.card, className, isSelected && styles.selected)} onClick={handleCardClick}>
      <div className={styles.cardContent}>
        <div className={styles.cardImage}>
          {imageUrl ? (
            <img src={imageUrl} alt={name} />
          ) : (
            <div className={styles.imagePlaceholder} />
          )}
        </div>

        <div className={styles.cardInfo}>
          <h3 className={styles.title}>{name}</h3>
          
          {equipment.length > 0 && (
            <div className={styles.equipment}>
              {equipment.join(' • ')}
            </div>
          )}
          
          <MuscleGroupBadge 
            type="block"
            groups={[...muscleGroups, ...targetMuscles]} 
            primaryGroups={muscleGroups} 
          />
        </div>

        <div className={styles.actions}>
          <button 
            className={cn(styles.likeButton, isLiked && styles.likeButton_active)}
            onClick={handleLike}
            aria-label="Нравится"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'}>
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <button 
            className={styles.arrowButton}
            onClick={handleArrow}
            aria-label="Открыть"
          >
            <span className={styles.arrowIcon}>›</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExerciseCard;