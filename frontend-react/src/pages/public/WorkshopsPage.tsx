import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { usePaginatedQuery } from '../../hooks/usePaginatedQuery';
import PublicLayout from '../../components/layout/PublicLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { workshopService } from '../../services/api';
import clsx from 'clsx';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import { useTranslation } from 'react-i18next';

const typeColors: Record<string, string> = {
  atelier: 'bg-blue-100 text-blue-700',
  formation: 'bg-purple-100 text-purple-700',
  conference: 'bg-amber-100 text-amber-700',
};

export default function WorkshopsPage() {
  const [type, setType] = useState('');
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr;
  const typeLabels: Record<string, string> = {
    atelier: t('workshops.type.atelier'),
    formation: t('workshops.type.formation'),
    conference: t('workshops.type.conference'),
  };

  const { items: workshops, total, totalPages, isLoading, page, setPage } = usePaginatedQuery({
    queryKey: ['workshops', type],
    queryFn: ({ page, limit }) => workshopService.getAll({ status: 'active', type: type || undefined, page, limit }),
    select: (data) => ({ items: data?.workshops ?? [], total: data?.total ?? 0 }),
    limit: 12,
  });

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('workshops.title')}</h1>
          <p className="text-gray-500 text-sm">{t('workshops.subtitle')}</p>
        </div>

        
        <div className="flex flex-wrap gap-2 mb-6">
          {['', 'atelier', 'formation', 'conference'].map((wtype) => (
            <button
              key={wtype}
              onClick={() => { setType(wtype); setPage(1); }}
              className={clsx(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                type === wtype
                  ? 'bg-primary-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              )}
            >
              {wtype === '' ? t('common.all') : typeLabels[wtype]}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : workshops.length === 0 ? (
          <EmptyState message={t('workshops.no_workshops')} />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {workshops.map((workshop) => {
                const spotsLeft = workshop.max_spots - workshop.enrolled;
                const full = spotsLeft <= 0;
                return (
                  <Link
                    key={workshop.id}
                    to={`/formations/${workshop.id}`}
                    className="card hover:shadow-md transition-shadow group"
                  >
                    <div className="mb-3">
                      <span className={clsx('badge text-xs font-medium', typeColors[workshop.type] || 'bg-gray-100 text-gray-600')}>
                        {typeLabels[workshop.type] || workshop.type}
                      </span>
                    </div>

                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
                      {workshop.title}
                    </h3>

                    <p className="text-sm text-gray-500 line-clamp-2 mb-4">{workshop.description}</p>

                    <div className="space-y-1 text-sm text-gray-500">
                      <p>{format(new Date(workshop.date), 'dd MMMM yyyy à HH:mm', { locale: dateLocale })}</p>
                      <p className="truncate">{workshop.location}</p>
                      <p>{workshop.duration} min</p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={clsx('text-sm font-medium', full ? 'text-red-500' : spotsLeft <= 3 ? 'text-amber-600' : 'text-gray-600')}>
                          {full ? t('workshops.full') : `${spotsLeft} ${t('workshops.spots')}`}
                        </span>
                        <span className="font-semibold text-gray-900">
                          {workshop.price === 0 ? t('workshops.free') : `${workshop.price}€`}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className={clsx('h-1.5 rounded-full transition-all', full ? 'bg-red-400' : spotsLeft <= 3 ? 'bg-amber-400' : 'bg-primary-500')}
                          style={{ width: `${Math.min(100, Math.round((workshop.enrolled / workshop.max_spots) * 100))}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-8" />
          </>
        )}
      </div>
    </PublicLayout>
  );
}
