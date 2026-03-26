import { useState } from 'react';
import { Flag, CheckCircle, XCircle, ExternalLink, Clock, Tag, AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePaginatedQuery } from '../../hooks/usePaginatedQuery';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { reportService } from '../../services/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { adminSidebar } from '../../config/sidebars';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';

const reasonLabels: Record<string, string> = {
  spam: 'Spam / Publicité',
  inappropriate: 'Contenu inapproprié',
  fake: 'Annonce frauduleuse',
  prohibited: 'Objet interdit',
  other: 'Autre',
};

const statusConfig: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  pending: { label: 'En attente', cls: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3.5 h-3.5" /> },
  resolved: { label: 'Résolu', cls: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  dismissed: { label: 'Ignoré', cls: 'bg-gray-100 text-gray-500', icon: <XCircle className="w-3.5 h-3.5" /> },
};

export default function AdminReports() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [resolving, setResolving] = useState<{ id: number; action: 'resolved' | 'dismissed' } | null>(null);
  const [adminNote, setAdminNote] = useState('');

  const { items: reports, total, totalPages, isLoading, page, setPage } = usePaginatedQuery({
    queryKey: ['admin-reports', statusFilter],
    queryFn: ({ page, limit }) => reportService.getAll({ status: statusFilter || undefined, page, limit }),
    select: (data) => ({ items: data?.reports ?? [], total: data?.total ?? 0 }),
    limit: 20,
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, status, note }: { id: number; status: string; note: string }) =>
      reportService.resolve(id, { status, admin_note: note }),
    onSuccess: (_, vars) => {
      toast.success(vars.status === 'resolved' ? 'Annonce retirée et signalement résolu.' : 'Signalement ignoré.');
      setResolving(null);
      setAdminNote('');
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    },
    onError: () => toast.error('Une erreur est survenue.'),
  });

  return (
    <DashboardLayout sidebarItems={adminSidebar} title="Signalements">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Signalements</h1>
            <p className="text-sm text-gray-500 mt-0.5">{total} signalement{total > 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {['pending', 'resolved', 'dismissed', ''].map((s) => (
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
              {s === '' ? 'Tous' : statusConfig[s]?.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><LoadingSpinner /></div>
        ) : reports.length === 0 ? (
          <EmptyState icon={<Flag className="w-10 h-10" />} message="Aucun signalement" />
        ) : (
          <div className="space-y-3">
            {reports.map((report: any) => {
              const s = statusConfig[report.status] ?? statusConfig.pending;
              return (
                <div key={report.id} className="card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={clsx('inline-flex items-center gap-1 badge text-xs', s.cls)}>
                          {s.icon}
                          {s.label}
                        </span>
                        <span className="badge bg-red-50 text-red-600 text-xs">
                          {reasonLabels[report.reason] ?? report.reason}
                        </span>
                      </div>

                      {/* Listing */}
                      {report.listing && (
                        <div className="flex items-center gap-2 mb-1">
                          <Tag className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <Link
                            to={`/annonces/${report.listing_id}`}
                            className="font-medium text-gray-900 hover:text-primary-600 transition-colors flex items-center gap-1"
                            target="_blank"
                          >
                            {report.listing.title}
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                          <span className={clsx('badge text-xs', report.listing.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                            {report.listing.status}
                          </span>
                        </div>
                      )}

                      {/* Reporter */}
                      <p className="text-xs text-gray-500 mb-1">
                        Signalé par <span className="font-medium">{report.user?.firstname} {report.user?.lastname}</span>
                        {' · '}
                        {format(new Date(report.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                      </p>

                      {report.details && (
                        <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mt-2">
                          "{report.details}"
                        </p>
                      )}

                      {report.admin_note && (
                        <p className="text-xs text-gray-400 mt-1 italic">Note admin : {report.admin_note}</p>
                      )}
                    </div>

                    {report.status === 'pending' && (
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button
                          onClick={() => setResolving({ id: report.id, action: 'resolved' })}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Retirer l'annonce
                        </button>
                        <button
                          onClick={() => resolveMutation.mutate({ id: report.id, status: 'dismissed', note: '' })}
                          disabled={resolveMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Ignorer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* Confirm resolve modal */}
      {resolving && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-semibold text-gray-900">Retirer l'annonce ?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              L'annonce sera rejetée et le propriétaire en sera notifié.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note pour le propriétaire</label>
              <textarea
                className="input w-full h-20 resize-none"
                placeholder="Expliquez la raison du retrait..."
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => { setResolving(null); setAdminNote(''); }} className="btn-secondary">Annuler</button>
              <button
                onClick={() => resolveMutation.mutate({ id: resolving.id, status: resolving.action, note: adminNote })}
                disabled={resolveMutation.isPending}
                className="bg-red-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-600 transition-colors"
              >
                {resolveMutation.isPending ? 'Traitement...' : 'Confirmer le retrait'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
