import { useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import cn from 'classnames';
import { Button } from '@/Components/UI/Button/Button';
import { useGuideCategoryArticlesQuery } from '@/hooks/useGuideCategoryArticlesQuery';
import { useAuthenticatedCall } from '@/hooks/useAuthenticatedCall';
import { useAuth } from '@/Auth';
import { authApi, type GuideArticleListItem, type GuideArticleResponse } from '@/Auth/authApi';
import styles from './Styles.module.scss';

const GuideCategoryPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const callWithAuth = useAuthenticatedCall();

  // Имя категории прокидывается из Справочника, чтобы не делать лишний запрос.
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

  const handleFavorite = async (e: React.MouseEvent, article: GuideArticleListItem) => {
    e.stopPropagation();
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
              <div
                key={article.id}
                className={styles.articleCard}
                onClick={() => handleArticleClick(article.id)}
              >
                <div className={styles.articleInfo}>
                  <span className={styles.articleTitle}>{article.title}</span>
                  {article.description && (
                    <span className={styles.articleDesc}>{article.description}</span>
                  )}
                  <span className={styles.articleMeta}>
                    <img src="/icons/Clock.svg" />
                    {article.reading_time_minutes} мин чтения
                  </span>
                </div>

                <div className={styles.rightCol}>
                  <button
                    className={cn(styles.likeBtn, article.is_favorite && styles.likeBtn_active)}
                    onClick={(e) => handleFavorite(e, article)}
                    aria-label="В избранное"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={article.is_favorite ? 'currentColor' : 'none'}>
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>

                  <svg
                    className={styles.chevron}
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M9 18L15 12L9 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GuideCategoryPage;
