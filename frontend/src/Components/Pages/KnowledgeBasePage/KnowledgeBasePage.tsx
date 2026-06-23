import { useNavigate } from "react-router-dom";
import styles from "./Styles.module.scss";
import { useGuideCategoriesQuery } from "@/hooks/useGuideCategoriesQuery";

interface FeatureCard {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  to: string;
}

const FEATURE_CARDS: FeatureCard[] = [
  {
    id: "exercises",
    title: "Упражнения",
    subtitle: "Каталог со всеми упражнениями",
    icon: "/AlmanahIcons/Calculate.svg",
    to: "/almanah/exercises",
  },
  {
    id: "templates",
    title: "Шаблоны тренировок",
    subtitle: "Готовые программы",
    icon: "/AlmanahIcons/Templates.svg",
    to: "/almanah/templates",
  },
];

const AlmanahPage = () => {
  const navigate = useNavigate();
  const { data: guideCategories = [], isPending } = useGuideCategoriesQuery();

  const getLastUpdated = (): string | null => {
    if (guideCategories.length === 0) return null;
    const latest = guideCategories.reduce((max, cat) => {
      const time = new Date(cat.updated_at).getTime();
      return time > max ? time : max;
    }, 0);
    if (!latest) return null;

    const today = new Date();
    const diffDays = Math.floor((today.getTime() - latest) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'Обновлено сегодня';
    if (diffDays === 1) return 'Обновлено 1 день назад';
    if (diffDays < 7) return `Обновлено ${diffDays} дня назад`;
    const d = new Date(latest);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `Обновлено ${dd}.${mm}`;
  };

  const lastUpdated = getLastUpdated();

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
            <h2 className={styles.heroTitle}>База знаний FlameFitness</h2>
            <p className={styles.heroDesc}>
              Питание, КБЖУ, упражнения, шаблоны тренировок и многое другое — всё в одном месте.
            </p>
            {lastUpdated && (
              <div className={styles.heroStatus}>
                <span className={styles.statusDot} />
                <span className={styles.statusText}>{lastUpdated}</span>
              </div>
            )}
          </div>
          <img
            src="/AlmanahIcons/Book.svg"
            className={styles.heroIcon}
          />
        </div>

        {/* Categories */}
        <div className={styles.categories}>
          <h3 className={styles.sectionTitle}>КАТЕГОРИИ</h3>

          <div className={styles.categoriesList}>
            {FEATURE_CARDS.map((cat) => (
              <button
                key={cat.id}
                className={styles.categoryCard}
                onClick={() => navigate(cat.to)}
              >
                <div className={styles.categoryIcon}>
                  <img src={cat.icon} alt={cat.title} />
                </div>
                <div className={styles.categoryInfo}>
                  <span className={styles.categoryTitle}>{cat.title}</span>
                  <span className={styles.categorySubtitle}>{cat.subtitle}</span>
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

            {guideCategories.map((cat) => (
              <button
                key={cat.id}
                className={styles.categoryCard}
                onClick={() =>
                  navigate(`/almanah/category/${cat.id}`, {
                    state: { categoryName: cat.name },
                  })
                }
              >
                <div className={styles.categoryIcon}>
                  <img src={cat.icon_url ?? "/AlmanahIcons/Book.svg"} alt={cat.name} />
                </div>
                <div className={styles.categoryInfo}>
                  <span className={styles.categoryTitle}>{cat.name}</span>
                  {cat.description && (
                    <span className={styles.categorySubtitle}>{cat.description}</span>
                  )}
                </div>

                {cat.articles_count > 0 && (
                  <span className={styles.categoryCount}>{cat.articles_count}</span>
                )}
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

            {isPending && (
              <p className={styles.emptyState}>Загрузка категорий...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlmanahPage;
