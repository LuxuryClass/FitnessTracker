import styles from './Styles.module.scss';
import { useState, useRef, useEffect } from 'react';
import cn from 'classnames';
import { SettingsTab } from './components/SettingsTab/SettingsTabs';
import { Button } from '@/Components/UI/Button/Button';

type TabType = 'settings' | 'exercises' | 'preview';

const CreateWorkoutPage = () => {
  const [activeTab, setActiveTab] = useState<TabType>('settings');
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabsRef = useRef<Record<TabType, HTMLButtonElement | null>>({
    settings: null,
    exercises: null,
    preview: null,
  });

  const tabs = [
    { id: 'settings' as TabType, label: 'Настройки' },
    { id: 'exercises' as TabType, label: 'Упражнения' },
    { id: 'preview' as TabType, label: 'Превью' },
  ];

  useEffect(() => {
    const activeElement = tabsRef.current[activeTab];
    if (activeElement) {
      const { offsetLeft, offsetWidth } = activeElement;
      setIndicatorStyle({ left: offsetLeft, width: offsetWidth });
    }
  }, [activeTab]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'settings':
        return <SettingsTab />;
      case 'exercises':
        return <div className={styles.placeholder}>Упражнения</div>;
      case 'preview':
        return <div className={styles.placeholder}>Превью</div>;
      default:
        return <SettingsTab />;
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Создание тренировки</h1>

        <div className={styles.tabs}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              ref={(el) => { tabsRef.current[tab.id] = el; }}
              className={cn(styles.tab, activeTab === tab.id && styles.tab_active)}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
          <div 
            className={styles.indicator} 
            style={{ 
              left: `${indicatorStyle.left}px`, 
              width: `${indicatorStyle.width}px` 
            }} 
          />
        </div>
      </div>

      <div className={styles.content}>
        {renderTabContent()}
      </div>

      <Button className={styles.create_button} size="l" fullWidth> 
        Начать
      </Button>
    </div>
  );
};

export default CreateWorkoutPage;