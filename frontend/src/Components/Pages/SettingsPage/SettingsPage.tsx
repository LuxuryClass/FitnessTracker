import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/Auth';
import styles from './Styles.module.scss';
import { useState, useRef } from 'react';
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

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState(defaultAvatar);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      return;
    }

    // Проверяем размер (макс 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Изображение должно быть меньше 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setAvatarSrc(result);
      // Здесь можно отправить на сервер
      // uploadAvatar(file);
    };
    reader.readAsDataURL(file);

    // Сбрасываем input, чтобы можно было выбрать тот же файл повторно
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
        />
        
        <div className={styles.profileInfo}>
          <h2 className={styles.name}>{user?.username || 'Пользователь'}</h2>
          <p className={styles.nickname}>{user?.username}@gmail.com</p>
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