import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/Auth';
import { ApiError, authApi } from '@/Auth/authApi';
import { isAccessTokenExpiredOrExpiring } from '@/Auth/security';
import styles from './Styles.module.scss';
import { useEffect, useRef, useState } from 'react';
import { LogoutModal } from '@/Components/Modals/LogoutModal/LogoutModal';

import avatarIcon from '/SettingsIcons/AvatarEdit.svg';
import editIcon from '/SettingsIcons/Edit.svg';
import notificationsIcon from '/SettingsIcons/Notification.svg';
import privacyIcon from '/SettingsIcons/Privacy.svg';
import logoutIcon from '/SettingsIcons/Logout.svg';
import defaultAvatar from '/masscot-main.png';

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  onClick?: () => void;
}

const preloadImage = async (src: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Не удалось загрузить изображение.'));
    image.src = src;
  });

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, tokens, logout, updateUser, refreshSession } = useAuth();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState(user?.avatar_url ?? defaultAvatar);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (previewUrlRef.current) {
      return;
    }
    setAvatarSrc(user?.avatar_url ?? defaultAvatar);
  }, [user?.avatar_url]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  const clearPreviewUrl = () => {
    if (!previewUrlRef.current) {
      return;
    }

    URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Ошибка при выходе:', error);
      setIsLoggingOut(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const uploadAvatar = async (file: File) => {
    if (!tokens?.accessToken) {
      throw new Error('Сессия истекла. Войдите заново.');
    }

    let accessToken = tokens.accessToken;
    if (isAccessTokenExpiredOrExpiring(accessToken)) {
      const refreshedTokens = await refreshSession();
      if (!refreshedTokens?.accessToken) {
        throw new Error('Сессия истекла. Войдите заново.');
      }
      accessToken = refreshedTokens.accessToken;
    }

    try {
      return await authApi.uploadAvatar(accessToken, file);
    } catch (error) {
      if (!(error instanceof ApiError) || (error.status !== 401 && error.status !== 403)) {
        throw error;
      }

      const refreshedTokens = await refreshSession();
      if (!refreshedTokens?.accessToken) {
        throw new Error('Сессия истекла. Войдите заново.');
      }

      return authApi.uploadAvatar(refreshedTokens.accessToken, file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Изображение должно быть меньше 5MB');
      e.target.value = '';
      return;
    }

    if (!tokens?.accessToken) {
      alert('Сессия истекла. Войдите заново.');
      e.target.value = '';
      return;
    }

    clearPreviewUrl();
    const localPreviewUrl = URL.createObjectURL(file);
    previewUrlRef.current = localPreviewUrl;
    setAvatarSrc(localPreviewUrl);

    setIsUploadingAvatar(true);
    try {
      const updatedUser = await uploadAvatar(file);
      if (updatedUser.avatar_url) {
        await preloadImage(updatedUser.avatar_url);
      }
      updateUser(updatedUser);
      setAvatarSrc(updatedUser.avatar_url ?? defaultAvatar);
      clearPreviewUrl();
    } catch (error) {
      clearPreviewUrl();
      setAvatarSrc(user?.avatar_url ?? defaultAvatar);
      if (error instanceof ApiError) {
        alert(error.message);
      } else {
        alert('Не удалось загрузить аватар. Попробуйте позже.');
      }
    } finally {
      setIsUploadingAvatar(false);
    }

    e.target.value = '';
  };

  const menuItems: MenuItem[] = [
    {
      id: 'edit-profile',
      label: 'Редактировать профиль',
      icon: editIcon,
      onClick: () => navigate('/edit-profile'),
    },
    {
      id: 'notifications',
      label: 'Уведомления',
      icon: notificationsIcon,
      onClick: () => navigate('/notifications'),
    },
    {
      id: 'privacy',
      label: 'Конфиденциальность',
      icon: privacyIcon,
      onClick: () => navigate('/privacy'),
    },
    {
      id: 'logout',
      label: 'Выйти',
      icon: logoutIcon,
      onClick: () => setIsLogoutModalOpen(true),
    },
  ];

  return (
    <div className={styles.page}>
      {/* Профиль */}
      <div className={styles.profile}>
        <div className={styles.avatar} onClick={handleAvatarClick}>
          <img
            src={avatarSrc}
            alt="Аватар"
            className={styles.avatarImage}
            loading="eager"
            decoding="async"
            onError={() => setAvatarSrc(defaultAvatar)}
          />
          <div className={styles.avatarIcon_wrapper}>
            <img src={avatarIcon} alt="редактировать" className={styles.avatarIcon} />
          </div>
        </div>
        
        {/* Скрытый input для выбора файла */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className={styles.fileInput}
          disabled={isUploadingAvatar}
        />
        
        <div className={styles.profileInfo}>
          <h2 className={styles.name}>{user?.name || 'Пользователь'}</h2>
          <p className={styles.nickname}>{user?.email || 'Email не указан'}</p>
        </div>
      </div>

      {/* Меню */}
      <div className={styles.menu}>
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`${styles.menuItem} ${item.id === 'logout' ? styles.menuItemDanger : ''}`}
            onClick={item.onClick}
          >
            <div className={styles.menuItemLeft}>
              <img src={item.icon} alt={item.label} className={styles.menuIcon} />
              <span className={styles.menuLabel}>{item.label}</span>
            </div>
            <svg className={styles.chevron} width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        ))}
      </div>

      {/* Попап подтверждения */}
      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        isLoggingOut={isLoggingOut}
      />
    </div>
  );
};

export default SettingsPage;
