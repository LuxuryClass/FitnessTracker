import { useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/Components/UI/Button/Button';
import { useGuideCategoryArticlesQuery } from '@/hooks/useGuideCategoryArticlesQuery';
import { useAuthenticatedCall } from '@/hooks/useAuthenticatedCall';
import { useAuth } from '@/Auth';
import { authApi, type GuideArticleListItem, type GuideArticleResponse } from '@/Auth/authApi';
import styles from './Styles.module.scss';
import { ArticleCard } from '@/Components/Common/ActicleCard/ArticleCard';

const GuideCategoryPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const callWithAuth = useAuthenticatedCall();

  const categoryName = (location.state as any)?.categoryName as string | undefined;

  const { data: articles = [], isPending } = useGuideCategoryArticlesQuery(id);
  const [pendingFav, setPendingFav] = useState<Set<string>>(new Set());

  const sortedArticles = useMemo(() => {
    return [...articles].sort((a, b) => {
      if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
      return 0;
    });
  }, [articles]);

  const handleArticleClick = (articleId: string) => {
    navigate(`/almanah/article/${articleId}`, {
      state: { categoryId: id, categoryName },
    });
  };

  const patchFavorite = (articleId: string, value: boolean) => {
    queryClient.setQueriesData<GuideArticleListItem[]>(
      { queryKey: ['guideCategoryArticles', user?.id] },
      (prev) => prev?.map((a) => (a.id === articleId ? { ...a, is_favorite: value } : a)),
    );
    queryClient.setQueryData<GuideArticleResponse>(['guideArticle', user?.id, articleId], (prev) =>
      prev ? { ...prev, is_favorite: value } : prev,
    );
  };

  const handleFavorite = async (article: GuideArticleListItem) => {
    if (pendingFav.has(article.id)) return;

    const next = !article.is_favorite;
    setPendingFav(prev => new Set(prev).add(article.id));
    patchFavorite(article.id, next);

    try {
      await callWithAuth((token) =>
        next
          ? authApi.addGuideArticleFavorite(token, article.id)
          : authApi.removeGuideArticleFavorite(token, article.id),
      );
    } catch {
      patchFavorite(article.id, !next);
    } finally {
      setPendingFav(prev => {
        const nextSet = new Set(prev);
        nextSet.delete(article.id);
        return nextSet;
      });
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button size="back" onClick={() => navigate('/almanah')} />
        <h1 className={styles.title}>{categoryName ?? 'Справочник'}</h1>
      </div>

      <div className={styles.content}>
        {isPending ? (
          <p className={styles.emptyState}>Загрузка...</p>
        ) : articles.length === 0 ? (
          <p className={styles.emptyState}>Статей пока нет</p>
        ) : (
          <div className={styles.articleList}>
            {sortedArticles.map(article => (
              <ArticleCard
                key={article.id}
                title={article.title}
                description={article.description}
                readingTimeMinutes={article.reading_time_minutes}
                isFavorite={article.is_favorite}
                onFavorite={() => handleFavorite(article)}
                onClick={() => handleArticleClick(article.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GuideCategoryPage;