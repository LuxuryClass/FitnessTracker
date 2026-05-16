import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/Auth';
import { authApi, ScheduleWorkoutItem } from '@/Auth/authApi';

export const useScheduleQuery = (dateFrom: string, dateTo: string) => {
  const { tokens, user } = useAuth();

  return useQuery<ScheduleWorkoutItem[]>({
    queryKey: ['schedule', user?.id, dateFrom, dateTo],
    queryFn: () => authApi.getSchedule(tokens!.accessToken, dateFrom, dateTo),
    enabled: !!tokens?.accessToken && !!dateFrom && !!dateTo,
    staleTime: 1000 * 60 * 2,
  });
};
