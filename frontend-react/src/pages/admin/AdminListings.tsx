import { useState } from 'react';
import { Tag, Search, CheckCircle, XCircle, Eye, Star } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/common/Modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listingService } from '../../services/api';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import type { Listing } from '../../types';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import clsx from 'clsx';
import { adminSidebar } from '../../config/sidebars';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import { listingStatuses } from '../../config/statuses';
import { useTranslation } from 'react-i18next';

export default function AdminListings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [rejectListing, setRejectListing] = useState<Listing | null>(null);
  const [viewListing, setViewListing] = useState<Listing | null>(null);

  const { register, handleSubmit, reset } = useForm<{ reason: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'listings', { search, status: statusFilter, page }],
    queryFn: () => listingService.getAdminAll({ search, status: statusFilter, page, limit: 15 }),
  });

  const listings = data?.data?.listings || [];
  const total = data?.data?.total || 0;
  const totalPages = Math.ceil(total / 15);

  const validateMutation = useMutation({
    mutationFn: (id: number) => listingService.validate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'listings'] });
      toast.success(t('common.success'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const sponsorMutation = useMutation({
    mutationFn: ({ id, isSponsored }: { id: number; isSponsored: boolean }) =>
      listingService.sponsor(id, isSponsored),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'listings'] });
      toast.success(t('common.success'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => listingService.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'listings'] });
      setRejectListing(null);
      reset();
      toast.success(t('common.success'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const onRejectSubmit = (data: { reason: string }) => {
    if (rejectListing) {
      rejectMutation.mutate({ id: rejectListing.id, reason: data.reason });
    }
  };

  return (
    <DashboardLayout sidebarItems={adminSidebar} title={t('admin_listings.title')}>
      <div className="space-y-5">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('admin_listings.search')}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input pl-9"
            />
          </div>
          <div className="flex gap-2">
            {['', 'pending', 'active', 'rejected', 'sold'].map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  statusFilter === s
                    ? 'bg-primary-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                )}
              >
                {s === '' ? t('admin_listings.all') : listingStatuses[s]?.label || s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm text-gray-500">{total} {t('admin_listings.col_listing').toLowerCase()}{total > 1 ? 's' : ''}</p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><LoadingSpinner /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="table-header">{t('admin_listings.col_listing')}</th>
                    <th className="table-header">{t('admin_listings.col_type')}</th>
                    <th className="table-header">{t('admin_listings.col_author')}</th>
                    <th className="table-header">{t('admin_listings.col_price')}</th>
                    <th className="table-header">{t('admin_listings.col_status')}</th>
                    <th className="table-header">{t('admin_listings.col_date')}</th>
                    <th className="table-header">{t('admin_listings.col_actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {listings.map((listing) => (
                    <tr key={listing.id} className="hover:bg-gray-50 transition-colors">
                      <td className="table-cell">
                        <div>
                          <p className="font-medium text-gray-900 line-clamp-1">{listing.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{listing.category?.name || t('admin_listings.no_category')}</p>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={clsx('badge', listing.type === 'don' ? 'bg-green-100 text-green-700' : 'bg-coral-400/20 text-coral-600')}>
                          {listing.type === 'don' ? t('admin_listings.don') : t('admin_listings.vente')}
                        </span>
                      </td>
                      <td className="table-cell text-gray-500">
                        {listing.user ? `${listing.user.firstname} ${listing.user.lastname}` : `User #${listing.user_id}`}
                      </td>
                      <td className="table-cell font-medium text-gray-700">
                        {listing.price ? `${listing.price}€` : t('admin_listings.free')}
                      </td>
                      <td className="table-cell">
                        <StatusBadge status={listing.status} config={listingStatuses} />
                      </td>
                      <td className="table-cell text-gray-500 text-xs">
                        {listing.created_at ? format(new Date(listing.created_at), 'dd MMM yyyy', { locale: fr }) : '-'}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setViewListing(listing)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                            title="Voir"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {listing.status === 'active' && (
                            <button
                              onClick={() => sponsorMutation.mutate({ id: listing.id, isSponsored: !listing.is_sponsored })}
                              className={`p-1.5 rounded-lg transition-colors ${listing.is_sponsored ? 'text-amber-500 bg-amber-50 hover:bg-amber-100' : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'}`}
                              title={listing.is_sponsored ? 'Retirer la mise en avant' : 'Mettre en avant'}
                            >
                              <Star className="w-4 h-4" />
                            </button>
                          )}
                          {listing.status === 'pending' && (
                            <>
                              <button
                                onClick={() => validateMutation.mutate(listing.id)}
                                disabled={validateMutation.isPending}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-green-500 hover:bg-green-50 transition-colors"
                                title="Valider"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setRejectListing(listing)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="Rejeter"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {listings.length === 0 && (
                <EmptyState icon={<Tag className="w-10 h-10" />} message={t('common.noData')} />
              )}
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="px-4 py-3 border-t border-gray-100" />
        </div>

        {/* Reject Modal */}
        <Modal isOpen={!!rejectListing} onClose={() => { setRejectListing(null); reset(); }} title={t('admin_listings.reject_modal')} size="sm">
          <p className="text-sm text-gray-600 mb-4">
            <strong>"{rejectListing?.title}"</strong>
          </p>
          <form onSubmit={handleSubmit(onRejectSubmit)} className="space-y-4">
            <div>
              <label className="label">{t('admin_listings.reject_label')}</label>
              <textarea
                {...register('reason', { required: true })}
                className="input min-h-[100px] resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setRejectListing(null); reset(); }} className="btn-secondary flex-1">{t('common.cancel')}</button>
              <button type="submit" disabled={rejectMutation.isPending} className="btn-danger flex-1">
                {rejectMutation.isPending ? t('admin_listings.rejecting') : t('admin_listings.reject_btn')}
              </button>
            </div>
          </form>
        </Modal>

        {/* View Modal */}
        <Modal isOpen={!!viewListing} onClose={() => setViewListing(null)} title={t('admin_listings.view_modal')} size="lg">
          {viewListing && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-xl text-gray-900">{viewListing.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{viewListing.category?.name}</p>
              </div>
              <p className="text-gray-700">{viewListing.description}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">{t('admin_listings.type_label')}</span> <strong>{viewListing.type}</strong></div>
                <div><span className="text-gray-500">{t('admin_listings.price_label')}</span> <strong>{viewListing.price ? `${viewListing.price}€` : t('admin_listings.free')}</strong></div>
                <div><span className="text-gray-500">{t('admin_listings.condition_label')}</span> <strong>{viewListing.condition}</strong></div>
                <div><span className="text-gray-500">{t('admin_listings.location_label')}</span> <strong>{viewListing.location}</strong></div>
                <div><span className="text-gray-500">{t('admin_listings.author_label')}</span> <strong>{viewListing.user ? `${viewListing.user.firstname} ${viewListing.user.lastname}` : '-'}</strong></div>
                <div><span className="text-gray-500">{t('admin_listings.status_label')}</span> <strong>{viewListing.status}</strong></div>
              </div>
              {viewListing.reject_reason && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-700"><strong>{t('admin_listings.reject_label')} :</strong> {viewListing.reject_reason}</p>
                </div>
              )}
              {viewListing.status === 'pending' && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { validateMutation.mutate(viewListing.id); setViewListing(null); }}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" /> {t('admin_listings.validate_btn')}
                  </button>
                  <button
                    onClick={() => { setRejectListing(viewListing); setViewListing(null); }}
                    className="btn-danger flex-1 flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" /> {t('admin_listings.reject_btn')}
                  </button>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
}
