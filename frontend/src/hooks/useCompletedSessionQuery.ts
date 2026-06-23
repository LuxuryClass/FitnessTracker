import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/Auth';
import { authApi, type WorkoutSession } from '@/Auth/authApi';
import { useAuthenticatedCall } from './useAuthenticatedCall';

export const useCompletedSessionQuery = (workoutId: string | undefined, enabled: boolean) => {
  const { tokens, user } = useAuth();
  const callWithAuth = useAuthenticatedCall();

  return useQuery<WorkoutSession | null>({
    queryKey: ['completedSession', user?.id, workoutId],
    queryFn: () => callWithAuth((token) => authApi.getCompletedSessionByWorkout(token, workoutId!)),
    enabled: !!tokens?.accessToken && !!workoutId && enabled,
    staleTime: 1000 * 60 * 2,
  });
};
