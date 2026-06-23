import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/Auth';
import { authApi, type WorkoutTemplate } from '@/Auth/authApi';
import { useAuthenticatedCall } from './useAuthenticatedCall';

export const useWorkoutTemplatesQuery = () => {
  const { tokens, user } = useAuth();
  const callWithAuth = useAuthenticatedCall();

  return useQuery<WorkoutTemplate[]>({
    queryKey: ['workoutTemplates', user?.id],
    queryFn: () => callWithAuth((token) => authApi.getWorkoutTemplates(token)),
    enabled: !!tokens?.accessToken,
    staleTime: 1000 * 60 * 5,
  });
};