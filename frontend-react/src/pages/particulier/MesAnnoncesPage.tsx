import { useState } from 'react';
import { Plus, Trash2, CheckCircle, Clock, XCircle, Tag, MapPin, Pencil, Zap } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePaginatedQuery } from '../../hooks/usePaginatedQuery';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { listingService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { particulierSidebar, proSidebar, adminSidebar } from '../../config/sidebars';
import clsx from 'clsx';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import { useTranslation } from 'react-i18next';

export default function MesAnnoncesPage() {
  const { t } = useTranslation();
  const statusConfig: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
    pending: { label: t('listings.status.pending'), icon: <Clock className="w-3.5 h-3.5" />, cls: 'bg-amber-100 text-amber-700' },
    active: { label: t('listings.status.active'), icon: <CheckCircle className="w-3.5 h-3.5" />, cls: 'bg-green-100 text-green-700' },
    rejected: { label: t('listings.status.rejected'), icon: <XCircle className="w-3.5 h-3.5" />, cls: 'bg-red-100 text-red-700' },
    sold: { label: t('listings.status.sold'), icon: <CheckCircle className="w-3.5 h-3.5" />, cls: 'bg-gray-100 text-gray-600' },
  };
  const { user } = useAuth();
  const sidebar = user?.role === 'professionnel' ? proSidebar : user?.role === 'admin' ? adminSidebar : particulierSidebar;
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [boostId, setBoostId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { items: listings, total, totalPages, isLoading, page, setPage } = usePaginatedQuery({
    queryKey: ['my-listings', statusFilter],
    queryFn: ({ page, limit }) => listingService.getMine({ status: statusFilter || undefined, page, limit }),
    select: (data) => ({ items: data?.listings ?? [], total: data?.total ?? 0 }),
    limit: 10,
  });

  const soldMutation = useMutation({
    mutationFn: (id: number) => listingService.markSold(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-listings'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => listingService.delete(id),
    onSuccess: () => {
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
    },
  });

  const boostMutation = useMutation({
    mutationFn: (id: number) => listingService.boost(id),
    onSuccess: (res) => {
      setBoostId(null);
      if (res.data.checkout_url) {
        window.location.href = res.data.checkout_url;
      } else {
        queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      }
    },
  });

  return (
    <DashboardLayout sidebarItems={sidebar} title={t('my_listings.title')}>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('my_listings.title')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('my_listings.count', { count: total })}</p>
          </div>
          <Link to="/annonces/creer" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {t('my_listings.new')}
          </Link>
        </div>

        
        <div className="flex flex-wrap gap-2">
          {['', 'pending', 'active', 'rejected', 'sold'].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={clsx(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                statusFilter === s
                  ? 'bg-primary-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              )}
            >
              {s === '' ? t('my_listings.all') : statusConfig[s]?.label ?? s}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><LoadingSpinner /></div>
        ) : listings.length === 0 ? (
          <EmptyState icon={<Tag className="w-10 h-10" />} message={t('my_listings.no_listings')} />
        ) : (
          <div className="space-y-3">
            {listings.map((listing) => {
              const s = statusConfig[listing.status] ?? { label: listing.status, cls: 'bg-gray-100 text-gray-600', icon: null };
              return (
                <div key={listing.id} className="card flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={clsx('inline-flex items-center gap-1 badge text-xs', s.cls)}>
                        {s.icon}
                        {s.label}
                      </span>
                      <span className={clsx('badge text-xs', listing.type === 'don' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>
                        {listing.type === 'don' ? t('listings.type.don') : t('listings.type.vente')}
                      </span>
                      {listing.price && listing.type === 'vente' && (
                        <span className="text-sm font-semibold text-gray-700">{listing.price}€</span>
                      )}
                    </div>
                    <Link to={`/annonces/${listing.id}`} className="font-medium text-gray-900 hover:text-primary-600 transition-colors line-clamp-1">
                      {listing.title}
                    </Link>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-400">
                      {listing.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {listing.location}
                        </span>
                      )}
                      <span>{format(new Date(listing.created_at), 'dd MMM yyyy', { locale: fr })}</span>
                    </div>
                    {listing.reject_reason && (
                      <p className="text-xs text-red-500 mt-1.5 bg-red-50 px-2 py-1 rounded">
                        {t('my_listings.reason')} {listing.reject_reason}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {listing.status === 'active' && listing.is_sponsored && (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-amber-100 text-amber-700 font-medium">
                        <Zap className="w-3 h-3" />
                        {t('my_listings.boosted')}
                      </span>
                    )}
                    {listing.status === 'active' && !listing.is_sponsored && (
                      <button
                        onClick={() => setBoostId(listing.id)}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors font-medium border border-amber-200"
                      >
                        <Zap className="w-3 h-3" />
                        {t('my_listings.boost_btn')}
                      </button>
                    )}
                    {listing.status === 'active' && (
                      <button
                        onClick={() => soldMutation.mutate(listing.id)}
                        disabled={soldMutation.isPending}
                        className="text-xs px-3 py-1.5 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors font-medium"
                      >
                        {t('my_listings.mark_sold')}
                      </button>
                    )}
                    {listing.status !== 'sold' && (
                      <Link
                        to={`/mes-annonces/${listing.id}/modifier`}
                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                    )}
                    <button
                      onClick={() => setDeleteId(listing.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {boostId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <Zap className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{t('my_listings.boost_modal_title')}</h3>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              {user?.has_used_free_boost ? t('my_listings.boost_modal_paid') : t('my_listings.boost_modal_free')}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setBoostId(null)} className="btn-secondary">{t('common.cancel')}</button>
              <button
                onClick={() => boostMutation.mutate(boostId)}
                disabled={boostMutation.isPending}
                className="bg-amber-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-amber-600 transition-colors"
              >
                {t('my_listings.boost_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('my_listings.delete_title')}</h3>
            <p className="text-sm text-gray-500 mb-5">{t('my_listings.irreversible')}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="btn-secondary">{t('common.cancel')}</button>
              <button
                onClick={() => deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
                className="bg-red-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-600 transition-colors"
              >
                {deleteMutation.isPending ? t('my_listings.deleting') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
