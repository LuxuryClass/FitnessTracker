import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/Auth';
import { authApi, type Workout } from '@/Auth/authApi';
import { useAuthenticatedCall } from './useAuthenticatedCall';

export const useWorkoutQuery = (workoutId: string | undefined) => {
  const { tokens, user } = useAuth();
  const callWithAuth = useAuthenticatedCall();

  return useQuery<Workout>({
    queryKey: ['workout', user?.id, workoutId],
    queryFn: () => callWithAuth((token) => authApi.getWorkout(token, workoutId!)),
    enabled: !!tokens?.accessToken && !!workoutId,
    staleTime: 1000 * 60 * 2,
  });
};
