import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/Auth';
import { authApi, RecentProgressItem } from '@/Auth/authApi';

export const useRecentProgressQuery = () => {
  const { tokens, user } = useAuth();

  return useQuery<RecentProgressItem[]>({
    queryKey: ['recentProgress', user?.id],
    queryFn: () => authApi.getRecentProgress(tokens!.accessToken),
    enabled: !!tokens?.accessToken,
    staleTime: 1000 * 60 * 2,
  });
};
