import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/Auth';
import { authApi, WeeklyMuscleFocusItem } from '@/Auth/authApi';

export const useWeeklyMuscleFocusQuery = () => {
  const { tokens, user } = useAuth();

  return useQuery<WeeklyMuscleFocusItem[]>({
    queryKey: ['weeklyMuscleFocus', user?.id],
    queryFn: () => authApi.getWeeklyMuscleFocus(tokens!.accessToken),
    enabled: !!tokens?.accessToken,
    staleTime: 1000 * 60 * 2,
  });
};