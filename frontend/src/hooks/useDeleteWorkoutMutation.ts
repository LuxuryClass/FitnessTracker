import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/Auth/authApi';
import { useAuthenticatedCall } from './useAuthenticatedCall';

type DeleteScope = 'this' | 'following' | 'all';

interface DeleteWorkoutVariables {
  workoutId: string;
  scope?: DeleteScope;
}

export const useDeleteWorkoutMutation = () => {
  const callWithAuth = useAuthenticatedCall();
  const queryClient = useQueryClient();

  return useMutation<void, Error, DeleteWorkoutVariables>({
    mutationFn: ({ workoutId, scope = 'this' }) =>
      callWithAuth((token) => authApi.deleteWorkout(token, workoutId, scope)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nextWorkout'] });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      // Кэш конкретной тренировки больше не валиден — она удалена
      queryClient.removeQueries({ queryKey: ['workout'] });
    },
  });
};