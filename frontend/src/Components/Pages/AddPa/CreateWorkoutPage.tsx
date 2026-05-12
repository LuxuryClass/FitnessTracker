import { useLocation } from 'react-router-dom';
import styles from './Styles.module.scss';
import { useState } from 'react';
import { SettingsTab } from './components/SettingsTab/SettingsTabs';
import { Button } from '@/Components/UI/Button/Button';
import { TabsGroup } from '@/Components/UI/TabsGroup/TabsGroup';

type TabType = 'settings' | 'exercises' | 'preview';

const tabs = [
  { id: 'settings' as TabType, label: 'Настройки' },
  { id: 'exercises' as TabType, label: 'Упражнения' },
  { id: 'preview' as TabType, label: 'Превью' },
];

const CreateWorkoutPage = () => {
  const location = useLocation();
  const passedDate = (location.state as any)?.scheduleDate as Date | undefined;
  const passedStartType = (location.state as any)?.startType as string | undefined;

  const [activeTab, setActiveTab] = useState<TabType>('settings');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'settings':
        return (
          <SettingsTab 
            initialStartType={passedStartType === 'schedule' ? 'schedule' : 'now'}
            initialDate={passedDate}
          />
        );
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
        <TabsGroup tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
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