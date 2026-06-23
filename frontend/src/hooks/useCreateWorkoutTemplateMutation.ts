import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, type WorkoutTemplate, type WorkoutTemplateCreatePayload } from '@/Auth/authApi';
import { useAuth } from '@/Auth';
import { useAuthenticatedCall } from './useAuthenticatedCall';

export const useCreateWorkoutTemplateMutation = () => {
  const callWithAuth = useAuthenticatedCall();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<WorkoutTemplate, Error, WorkoutTemplateCreatePayload>({
    mutationFn: (payload) => callWithAuth((token) => authApi.createWorkoutTemplate(token, payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutTemplates', user?.id] });
    },
  });
};