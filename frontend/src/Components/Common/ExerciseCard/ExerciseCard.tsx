import styles from './Styles.module.scss';
import cn from 'classnames';

interface ExerciseCardProps {
  id: string;
  name: string;
  muscleGroups?: string[];
  targetMuscles: string[];
  equipment?: string[];
  imageUrl?: string;
  onClick?: () => void;
  onToggle?: (id: string) => void;
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
  onClick,
  onToggle,
  isSelected = false,
  className
}: ExerciseCardProps) => {
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle?.(id);
  };

  const primarySet = new Set(muscleGroups);
  const secondaryMuscles = targetMuscles.filter(m => !primarySet.has(m));

  return (
    <div className={cn(styles.card, className, isSelected && styles.selected)} onClick={onClick}>
      <div className={styles.cardContent}>
        {/* Картинка */}
        <div className={styles.cardImage}>
          {imageUrl ? (
            <img src={imageUrl} alt={name} />
          ) : (
            <div className={styles.imagePlaceholder}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          )}
        </div>

        {/* Информация */}
        <div className={styles.cardInfo}>
          <h3 className={styles.title}>{name}</h3>
          
          {/* Оборудование */}
          {equipment.length > 0 && (
            <div className={styles.equipment}>
              {equipment.join(' • ')}
            </div>
          )}
          
          {/* Мышцы */}
          <div className={styles.muscles}>
            {muscleGroups.map((group, index) => (
              <span key={`primary-${index}`} className={cn(styles.muscleTag, styles.muscleTagPrimary)}>
                {group}
              </span>
            ))}
            {secondaryMuscles.map((muscle, index) => (
              <span key={`secondary-${index}`} className={styles.muscleTag}>
                {muscle}
              </span>
            ))}
          </div>
        </div>

        {/* Кнопка добавления/удаления */}
        <button 
          className={cn(styles.actionButton, isSelected && styles.selectedButton)}
          onClick={handleToggle}
        >
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none"
            className={styles.icon}
          >
            <path 
              d="M12 5V19M5 12H19" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round"
              className={styles.plusIcon}
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ExerciseCard;