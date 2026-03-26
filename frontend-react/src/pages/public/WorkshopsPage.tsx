import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Clock, Users, Tag, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePaginatedQuery } from '../../hooks/usePaginatedQuery';
import PublicLayout from '../../components/layout/PublicLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { workshopService } from '../../services/api';
import clsx from 'clsx';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';

const typeLabels: Record<string, string> = {
  atelier: 'Atelier',
  formation: 'Formation',
  conference: 'Conférence',
};

const typeColors: Record<string, string> = {
  atelier: 'bg-blue-100 text-blue-700',
  formation: 'bg-purple-100 text-purple-700',
  conference: 'bg-amber-100 text-amber-700',
};

export default function WorkshopsPage() {
  const [type, setType] = useState('');

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
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Ateliers & Formations</h1>
          <p className="text-gray-500 text-sm">Participez à des ateliers et formations autour de l'upcycling</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['', 'atelier', 'formation', 'conference'].map((t) => (
            <button
              key={t}
              onClick={() => { setType(t); setPage(1); }}
              className={clsx(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                type === t
                  ? 'bg-primary-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              )}
            >
              {t === '' ? 'Tous' : typeLabels[t]}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : workshops.length === 0 ? (
          <EmptyState icon={<Calendar className="w-10 h-10" />} message="Aucune formation disponible" />
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
                    <div className="flex items-start justify-between mb-3">
                      <span className={clsx('badge text-xs font-medium', typeColors[workshop.type] || 'bg-gray-100 text-gray-600')}>
                        {typeLabels[workshop.type] || workshop.type}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </div>

                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
                      {workshop.title}
                    </h3>

                    <p className="text-sm text-gray-500 line-clamp-2 mb-4">{workshop.description}</p>

                    <div className="space-y-1.5 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{format(new Date(workshop.date), 'dd MMMM yyyy à HH:mm', { locale: fr })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{workshop.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{workshop.duration} min</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className={clsx('font-medium', full ? 'text-red-500' : 'text-gray-600')}>
                          {full ? 'Complet' : `${spotsLeft} place${spotsLeft > 1 ? 's' : ''} restante${spotsLeft > 1 ? 's' : ''}`}
                        </span>
                      </div>
                      <span className="font-semibold text-gray-900">
                        {workshop.price === 0 ? 'Gratuit' : `${workshop.price}€`}
                      </span>
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
