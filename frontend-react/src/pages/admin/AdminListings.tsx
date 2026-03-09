import { useState } from 'react';
import { LayoutDashboard, Users, Tag, BookOpen, Package, DollarSign, Settings, Search, CheckCircle, XCircle, Eye } from 'lucide-react';
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

const sidebarItems = [
  { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Utilisateurs', path: '/admin/utilisateurs', icon: <Users className="w-4 h-4" /> },
  { label: 'Annonces', path: '/admin/annonces', icon: <Tag className="w-4 h-4" /> },
  { label: 'Formations', path: '/admin/formations', icon: <BookOpen className="w-4 h-4" /> },
  { label: 'Conteneurs', path: '/admin/conteneurs', icon: <Package className="w-4 h-4" /> },
  { label: 'Finance', path: '/admin/finance', icon: <DollarSign className="w-4 h-4" /> },
  { label: 'Configuration', path: '/admin/config', icon: <Settings className="w-4 h-4" /> },
];

const statusConfig = {
  pending: { label: 'En attente', class: 'badge-orange' },
  active: { label: 'Active', class: 'badge-green' },
  rejected: { label: 'Rejetée', class: 'badge-red' },
  sold: { label: 'Vendue', class: 'badge-gray' },
};

export default function AdminListings() {
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
      toast.success('Annonce validée !');
    },
    onError: () => toast.error('Erreur lors de la validation'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => listingService.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'listings'] });
      setRejectListing(null);
      reset();
      toast.success('Annonce rejetée');
    },
    onError: () => toast.error('Erreur lors du rejet'),
  });

  const onRejectSubmit = (data: { reason: string }) => {
    if (rejectListing) {
      rejectMutation.mutate({ id: rejectListing.id, reason: data.reason });
    }
  };

  return (
    <DashboardLayout sidebarItems={sidebarItems} title="Gestion des annonces">
      <div className="space-y-5">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une annonce..."
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
                {s === '' ? 'Toutes' : statusConfig[s as keyof typeof statusConfig]?.label || s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm text-gray-500">{total} annonce{total > 1 ? 's' : ''}</p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><LoadingSpinner /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="table-header">Annonce</th>
                    <th className="table-header">Type</th>
                    <th className="table-header">Auteur</th>
                    <th className="table-header">Prix</th>
                    <th className="table-header">Statut</th>
                    <th className="table-header">Date</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {listings.map((listing) => (
                    <tr key={listing.id} className="hover:bg-gray-50 transition-colors">
                      <td className="table-cell">
                        <div>
                          <p className="font-medium text-gray-900 line-clamp-1">{listing.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{listing.category?.name || 'Sans catégorie'}</p>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={clsx('badge', listing.type === 'don' ? 'bg-green-100 text-green-700' : 'bg-coral-400/20 text-coral-600')}>
                          {listing.type === 'don' ? 'Don' : 'Vente'}
                        </span>
                      </td>
                      <td className="table-cell text-gray-500">
                        {listing.user ? `${listing.user.firstname} ${listing.user.lastname}` : `User #${listing.user_id}`}
                      </td>
                      <td className="table-cell font-medium text-gray-700">
                        {listing.price ? `${listing.price}€` : 'Gratuit'}
                      </td>
                      <td className="table-cell">
                        <span className={clsx('badge', statusConfig[listing.status as keyof typeof statusConfig]?.class || 'badge-gray')}>
                          {statusConfig[listing.status as keyof typeof statusConfig]?.label || listing.status}
                        </span>
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
                <div className="text-center py-12 text-gray-400">
                  <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Aucune annonce trouvée</p>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-500">Page {page} / {totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary py-1.5 px-3 disabled:opacity-50 text-sm">
                  Préc.
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary py-1.5 px-3 disabled:opacity-50 text-sm">
                  Suiv.
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Reject Modal */}
        <Modal isOpen={!!rejectListing} onClose={() => { setRejectListing(null); reset(); }} title="Rejeter l'annonce" size="sm">
          <p className="text-sm text-gray-600 mb-4">
            Annonce : <strong>"{rejectListing?.title}"</strong>
          </p>
          <form onSubmit={handleSubmit(onRejectSubmit)} className="space-y-4">
            <div>
              <label className="label">Motif du rejet</label>
              <textarea
                {...register('reason', { required: true })}
                className="input min-h-[100px] resize-none"
                placeholder="Expliquez pourquoi cette annonce est rejetée..."
              />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setRejectListing(null); reset(); }} className="btn-secondary flex-1">Annuler</button>
              <button type="submit" disabled={rejectMutation.isPending} className="btn-danger flex-1">
                {rejectMutation.isPending ? 'Rejet...' : 'Rejeter'}
              </button>
            </div>
          </form>
        </Modal>

        {/* View Modal */}
        <Modal isOpen={!!viewListing} onClose={() => setViewListing(null)} title="Détail de l'annonce" size="lg">
          {viewListing && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-xl text-gray-900">{viewListing.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{viewListing.category?.name}</p>
              </div>
              <p className="text-gray-700">{viewListing.description}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Type :</span> <strong>{viewListing.type}</strong></div>
                <div><span className="text-gray-500">Prix :</span> <strong>{viewListing.price ? `${viewListing.price}€` : 'Gratuit'}</strong></div>
                <div><span className="text-gray-500">État :</span> <strong>{viewListing.condition}</strong></div>
                <div><span className="text-gray-500">Lieu :</span> <strong>{viewListing.location}</strong></div>
                <div><span className="text-gray-500">Auteur :</span> <strong>{viewListing.user ? `${viewListing.user.firstname} ${viewListing.user.lastname}` : '-'}</strong></div>
                <div><span className="text-gray-500">Statut :</span> <strong>{viewListing.status}</strong></div>
              </div>
              {viewListing.reject_reason && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-700"><strong>Motif du rejet :</strong> {viewListing.reject_reason}</p>
                </div>
              )}
              {viewListing.status === 'pending' && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { validateMutation.mutate(viewListing.id); setViewListing(null); }}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" /> Valider
                  </button>
                  <button
                    onClick={() => { setRejectListing(viewListing); setViewListing(null); }}
                    className="btn-danger flex-1 flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" /> Rejeter
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
