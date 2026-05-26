import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/Auth';
import { authApi, type NextWorkoutResponse } from '@/Auth/authApi';
import { useAuthenticatedCall } from './useAuthenticatedCall';

export const useNextWorkoutQuery = () => {
  const { tokens, user } = useAuth();
  const callWithAuth = useAuthenticatedCall();

  return useQuery<NextWorkoutResponse | null>({
    queryKey: ['nextWorkout', user?.id],
    queryFn: () => callWithAuth((token) => authApi.getNextWorkout(token)),
    enabled: !!tokens?.accessToken,
    staleTime: 1000 * 60 * 2,
  });
};
