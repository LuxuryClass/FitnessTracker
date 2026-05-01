import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/Auth';
import { Button } from '@/Components/UI/Button/Button';
import { TabsGroup } from '@/Components/UI/TabsGroup/TabsGroup';
import styles from './Styles.module.scss';

type Gender = 'male' | 'female';

const genderTabs = [
  { id: 'male' as Gender, label: 'Мужской' },
  { id: 'female' as Gender, label: 'Женский' },
];

interface ProfileFormData {
  name: string;
  nickname: string;
  gender: Gender | '';
  birthDate: string;
  height: string;
  weight: string;
}

const EditProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<ProfileFormData>({
    name: user?.username || '',
    nickname: user?.username || '',
    gender: '',
    birthDate: '',
    height: '',
    weight: '',
  });

  const handleChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      navigate(-1);
    } catch (error) {
      console.error('Ошибка сохранения:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Заголовок */}
      <div className={styles.header}>
        <Button size="back" />
        <h1 className={styles.title}>Редактировать профиль</h1>
      </div>

      {/* Форма */}
      <div className={styles.form}>
        {/* Имя */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Имя</h3>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Актуальное имя"
            className={styles.input}
          />
        </div>

        {/* Дата рождения */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Дата рождения</h3>
          <input
            type="date"
            value={formData.birthDate}
            onChange={(e) => handleChange('birthDate', e.target.value)}
            className={styles.input}
          />
        </div>

        {/* Пол */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Пол</h3>
          <TabsGroup<'male' | 'female'>
            tabs={genderTabs}
            activeTab={(formData.gender || 'male') as 'male' | 'female'}
            onChange={(id) => handleChange('gender', id)}
            variant="dark"
            />
        </div>

        {/* Рост */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Рост</h3>
          <input
            type="text"
            value={formData.height}
            onChange={(e) => handleChange('height', e.target.value)}
            placeholder="Актуальный рост"
            className={styles.input}
          />
        </div>

        {/* Вес */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Вес</h3>
          <input
            type="text"
            value={formData.weight}
            onChange={(e) => handleChange('weight', e.target.value)}
            placeholder="Актуальный вес"
            className={styles.input}
          />
        </div>
        {/* Кнопка сохранения */}
        <div className={styles.buttonWrapper}>
            <Button
            size="l"
            color="primary"
            fullWidth
            onClick={handleSave}
            disabled={isSaving}
            >
            {isSaving ? 'Сохранение...' : 'Сохранить'}
            </Button>
        </div>
      </div>

    </div>
  );
};

export default EditProfilePage;