import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/Auth';
import { authApi, type GuideCategoryListItem } from '@/Auth/authApi';
import { useAuthenticatedCall } from './useAuthenticatedCall';

export const useGuideCategoriesQuery = () => {
  const { tokens, user } = useAuth();
  const callWithAuth = useAuthenticatedCall();

  return useQuery<GuideCategoryListItem[]>({
    queryKey: ['guideCategories', user?.id],
    queryFn: () => callWithAuth((token) => authApi.getGuideCategories(token)),
    enabled: !!tokens?.accessToken,
    staleTime: 1000 * 60 * 10,
  });
};