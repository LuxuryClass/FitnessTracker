import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/Auth';
import { notificationsApi, type NotificationSettings } from '@/Notifications';
import { useAuthenticatedCall } from './useAuthenticatedCall';

export const useNotificationSettingsQuery = () => {
  const { tokens, user } = useAuth();
  const callWithAuth = useAuthenticatedCall();

  return useQuery<NotificationSettings>({
    queryKey: ['notificationSettings', user?.id],
    queryFn: () => callWithAuth((token) => notificationsApi.getSettings(token)),
    enabled: !!tokens?.accessToken,
    staleTime: 1000 * 60 * 2,
  });
};
