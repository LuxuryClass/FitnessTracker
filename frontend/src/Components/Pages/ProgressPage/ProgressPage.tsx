import styles from './Styles.module.scss';

const ProgressPage = () => {

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Прогресс</h1>
      </div>

      <div className={styles.content}>
        <div className={styles.placeholder}>
          <div className={styles.placeholderIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className={styles.placeholderTitle}>Скоро здесь появится ваша статистика</h2>
          <p className={styles.placeholderText}>
            Эта страница будет реализована в ближайшее время
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProgressPage;