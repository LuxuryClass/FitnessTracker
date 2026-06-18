import { useNavigate } from "react-router-dom";
import styles from "./Styles.module.scss";
import cn from "classnames";

interface Category {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  highlighted?: boolean;
}

const categories: Category[] = [
  {
    id: "nutrition",
    title: "Правильное питание",
    subtitle: "Основы здорового рациона",
    icon: "/AlmanahIcons/Calculate.svg",
  },
  {
    id: "kcal",
    title: "КБЖУ",
    subtitle: "Калории, белки, жиры, углеводы",
    icon: "/AlmanahIcons/Calculate.svg",
  },
  {
    id: "exercises",
    title: "Упражнения",
    subtitle: "Техника выполнения",
    icon: "/AlmanahIcons/Calculate.svg",
  },
  {
    id: "templates",
    title: "Шаблоны тренировок",
    subtitle: "Готовые программы",
    icon: "/AlmanahIcons/Templates.svg",
  },
  {
    id: "plans",
    title: "Тренировочные планы",
    subtitle: "Построение программы",
    icon: "/AlmanahIcons/Shedule.svg",
  },
  {
    id: "safety",
    title: "Техника безопасности",
    subtitle: "Как избежать травм",
    icon: "/AlmanahIcons/Shield.svg",
  },
  {
    id: "faq",
    title: "FAQ",
    subtitle: "Часто задаваемые вопросы",
    icon: "/AlmanahIcons/Question.svg",
  },
  {
    id: "suggest",
    title: "Предложить тему",
    subtitle: "Напишите, что добавить",
    icon: "/AlmanahIcons/Chat.svg",
    highlighted: true,
  },
];

const AlmanahPage = () => {
  const navigate = useNavigate();

  const getLastUpdated = (): string => {
  const today = new Date();
  const daysSinceUpdate = 2; // потом можно будет тянуть из API
  const updateDate = new Date(today);
  updateDate.setDate(today.getDate() - daysSinceUpdate);
  
  const diffDays = Math.floor((today.getTime() - updateDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Обновлено сегодня';
    if (diffDays === 1) return 'Обновлено 1 день назад';
    if (diffDays < 7) return `Обновлено ${diffDays} дня назад`;
    if (diffDays < 31) return `Обновлено ${Math.floor(diffDays / 7)} недели назад`;
    return `Обновлено ${Math.floor(diffDays / 30)} месяца назад`;
    };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>Справочник</h1>
        </div>
      </div>

      <div className={styles.content}>
        {/* Hero Banner */}
        <div className={styles.hero}>
          <div className={styles.heroContent}>
            <h2 className={styles.heroTitle}>База знаний FitnessFlame</h2>
            <p className={styles.heroDesc}>
              Питание, КБЖУ, упражнения, шаблоны и планы
            </p>
            <div className={styles.heroStatus}>
              <span className={styles.statusDot} />
              <span className={styles.statusText}>{getLastUpdated()}</span>
            </div>
          </div>
          <img
            src="/public/AlmanahIcons/Book.svg"
            className={styles.heroIcon}
          />
        </div>

        {/* Categories */}
        <div className={styles.categories}>
          <h3 className={styles.sectionTitle}>КАТЕГОРИИ</h3>

          <div className={styles.categoriesList}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={cn(
                  styles.categoryCard,
                  cat.highlighted && styles.categoryCard_highlighted,
                )}
                onClick={() => navigate(`/almanah/${cat.id}`)}
              >
                <div className={styles.categoryIcon}>
                  <img src={cat.icon} alt={cat.title} />
                </div>
                <div className={styles.categoryInfo}>
                  <span className={styles.categoryTitle}>{cat.title}</span>
                  <span className={styles.categorySubtitle}>
                    {cat.subtitle}
                  </span>
                </div>
                <svg
                  className={styles.categoryChevron}
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M9 18L15 12L9 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlmanahPage;
