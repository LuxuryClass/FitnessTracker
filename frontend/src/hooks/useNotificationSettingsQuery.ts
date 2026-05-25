import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/Auth';
import { notificationsApi, type NotificationSettings } from '@/Notifications';

export const useNotificationSettingsQuery = () => {
  const { tokens, user } = useAuth();

  return useQuery<NotificationSettings>({
    queryKey: ['notificationSettings', user?.id],
    queryFn: () => notificationsApi.getSettings(tokens!.accessToken),
    enabled: !!tokens?.accessToken,
    staleTime: 1000 * 60 * 2,
  });
};
