import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PublicLayout from '../../components/layout/PublicLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { articleService } from '../../services/api';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import clsx from 'clsx';
import type { Article } from '../../types';
import { useTranslation } from 'react-i18next';

export default function ConseilsPage() {
  const [activeTag, setActiveTag] = useState('');
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr;

  const { data, isLoading } = useQuery({
    queryKey: ['articles', activeTag],
    queryFn: () => articleService.getAll({ limit: 50, tag: activeTag || undefined }),
  });

  // Liste complète des tags : requête non filtrée pour que les chips ne disparaissent pas
  const { data: allData } = useQuery({
    queryKey: ['articles', 'all-tags'],
    queryFn: () => articleService.getAll({ limit: 50 }),
  });

  const articles: Article[] = data?.data?.articles ?? [];

  const allTags = Array.from(
    new Set(
      (allData?.data?.articles ?? []).flatMap(a =>
        a.tags ? a.tags.split(',').map(t => t.trim()).filter(Boolean) : []
      )
    )
  );

  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('conseils.title')}</h1>
          <p className="text-gray-500 mt-1">{t('conseils.subtitle')}</p>
        </div>

        
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-6">
            <button
              type="button"
              onClick={() => setActiveTag('')}
              className={clsx(
                'flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                !activeTag ? 'bg-[#2D5016] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {t('conseils.all')}
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(activeTag === tag ? '' : tag)}
                className={clsx(
                  'flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                  activeTag === tag ? 'bg-[#2D5016] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        
        {isLoading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : articles.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium text-gray-600">{t('conseils.no_articles')}</p>
            <p className="text-sm mt-1">{t('conseils.no_articles_sub')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {articles.map(article => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}

function ArticleCard({ article }: { article: Article }) {
  const { t: translate, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr;
  const tags = article.tags ? article.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
  const excerpt = article.content?.slice(0, 140).trim();

  return (
    <Link
      to={`/conseils/${article.id}`}
      className="bg-white rounded-2xl border-2 border-gray-100 p-5 hover:border-[#2D5016]/30 hover:shadow-sm transition-all group flex flex-col gap-3"
    >
      
      {tags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {tags.map(tag => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-[#2D5016] font-medium">
              {tag}
            </span>
          ))}
        </div>
      )}

      
      <h3 className="font-bold text-gray-900 text-lg leading-snug group-hover:text-[#2D5016] transition-colors">
        {article.title}
      </h3>

      
      {excerpt && (
        <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">
          {excerpt}{article.content.length > 140 ? '…' : ''}
        </p>
      )}

      
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
        <div className="text-xs text-gray-400">
          <span className="font-medium text-gray-600">
            {article.author?.firstname} {article.author?.lastname}
          </span>
          {' · '}{format(new Date(article.created_at), 'dd MMM yyyy', { locale: dateLocale })}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>{article.views} vues</span>
        </div>
      </div>
    </Link>
  );
}
