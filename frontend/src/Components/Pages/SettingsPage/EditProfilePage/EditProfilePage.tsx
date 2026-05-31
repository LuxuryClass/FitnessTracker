import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/Auth';
import { ApiError, authApi, type UpdateProfilePayload } from '@/Auth/authApi';
import { Button } from '@/Components/UI/Button/Button';
import { TabsGroup } from '@/Components/UI/TabsGroup/TabsGroup';
import styles from './Styles.module.scss';

type Gender = 'male' | 'female' | 'none';

const genderTabs = [
  { id: 'none' as Gender, label: 'Не указан' },
  { id: 'male' as Gender, label: 'Мужской' },
  { id: 'female' as Gender, label: 'Женский' },
];

interface ProfileFormData {
  name: string;
  gender: Gender;
  birthDate: string;
  height: string;
  weight: string;
}

// Константы ограничений, соответствующие серверной валидации
const LIMITS = {
  height: { min: 0, max: 999.99 },
  weight: { min: 0, max: 999.99 },
};

const EditProfilePage = () => {
  const navigate = useNavigate();
  const { user, tokens, updateUser, refreshSession } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [profileErrors, setProfileErrors] = useState<{ height?: string; weight?: string }>({});

  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    gender: 'none',
    birthDate: '',
    height: '',
    weight: '',
  });

  useEffect(() => {
    setFormData({
      name: user?.name || '',
      gender: user?.gender || 'none',
      birthDate: user?.birth_date || '',
      height: user?.height?.toString() || '',
      weight: user?.weight?.toString() || '',
    });
    // сброс ошибок при новом пользователе
    setProfileErrors({});
  }, [user]);

  const handleChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // сброс ошибки при редактировании поля
    setProfileErrors(prev => ({ ...prev, [field]: undefined }));
  };

  /**
   * Проверяет, что рост и вес находятся в допустимых пределах.
   * @returns true, если данные валидны, иначе false
   */
  const validateProfileMetrics = (): boolean => {
    const errors: { height?: string; weight?: string } = {};
    const heightValue = formData.height.trim();
    const weightValue = formData.weight.trim();

    if (heightValue !== '') {
      const h = Number(heightValue);
      if (isNaN(h) || h < LIMITS.height.min || h > LIMITS.height.max) {
        errors.height = `Рост должен быть от ${LIMITS.height.min} до ${LIMITS.height.max} см`;
      }
    }

    if (weightValue !== '') {
      const w = Number(weightValue);
      if (isNaN(w) || w < LIMITS.weight.min || w > LIMITS.weight.max) {
        errors.weight = `Вес должен быть от ${LIMITS.weight.min} до ${LIMITS.weight.max} кг`;
      }
    }

    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const buildProfilePayload = (): UpdateProfilePayload => {
    const payload: UpdateProfilePayload = {
      name: formData.name.trim(),
    };

    if (formData.gender !== 'none') {
      payload.gender = formData.gender;
    }

    if (formData.birthDate) {
      payload.birth_date = formData.birthDate;
    }

    if (formData.height.trim()) {
      payload.height = formData.height.trim();
    }

    if (formData.weight.trim()) {
      payload.weight = formData.weight.trim();
    }

    return payload;
  };

  const saveProfile = async (payload: UpdateProfilePayload) => {
    if (!tokens?.accessToken) {
      throw new Error('Сессия истекла. Войдите заново.');
    }

    try {
      return await authApi.updateProfile(tokens.accessToken, payload);
    } catch (error) {
      if (!(error instanceof ApiError) || (error.status !== 401 && error.status !== 403)) {
        throw error;
      }

      const refreshedTokens = await refreshSession();
      if (!refreshedTokens?.accessToken) {
        throw new Error('Сессия истекла. Войдите заново.');
      }

      return authApi.updateProfile(refreshedTokens.accessToken, payload);
    }
  };

  const handleSave = async () => {
    // 1. Валидация числовых полей
    if (!validateProfileMetrics()) return;

    setIsSaving(true);
    try {
      if (!formData.name.trim()) {
        throw new Error('Имя не может быть пустым.');
      }

      const updatedUser = await saveProfile(buildProfilePayload());
      updateUser(updatedUser);
      navigate(-1);
    } catch (error) {
      if (error instanceof ApiError) {
        alert(error.message);
      } else if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('Не удалось сохранить профиль.');
      }
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
          <TabsGroup<Gender>
            tabs={genderTabs}
            activeTab={formData.gender}
            onChange={(id) => handleChange('gender', id)}
            type="dark"
          />
        </div>

        {/* Рост */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Рост</h3>
          <input
            type="number"
            min={LIMITS.height.min}
            max={LIMITS.height.max}
            step="0.01"
            inputMode="decimal"
            value={formData.height}
            onChange={(e) => handleChange('height', e.target.value)}
            placeholder="Актуальный рост"
            className={styles.input}
          />
          {profileErrors.height && <span className={styles.errorMessage}>{profileErrors.height}</span>}
        </div>

        {/* Вес */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Вес</h3>
          <input
            type="number"
            min={LIMITS.weight.min}
            max={LIMITS.weight.max}
            step="0.01"
            inputMode="decimal"
            value={formData.weight}
            onChange={(e) => handleChange('weight', e.target.value)}
            placeholder="Актуальный вес"
            className={styles.input}
          />
          {profileErrors.weight && <span className={styles.errorMessage}>{profileErrors.weight}</span>}
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
