import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Package, MapPin, CheckCircle, Clock, XCircle, KeyRound, ScanBarcode } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { containerService } from '../../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { particulierSidebar, adminSidebar } from '../../config/sidebars';
import { useAuth } from '../../context/AuthContext';
import type { ContainerRequest } from '../../types';
import { useTranslation } from 'react-i18next';

function BarcodeImage({ requestId }: { requestId: number }) {
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    containerService.getBarcodeUrl(requestId)
      .then(u => { if (active) { objectUrl = u; setUrl(u); } })
      .catch(() => { if (active) setError(true); });
    return () => {
      active = false;
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
  }, [requestId]);

  if (error) return <p className="text-xs text-red-500">{t('depots.barcode_unavailable')}</p>;
  if (!url) return <div className="h-[90px] flex items-center justify-center"><LoadingSpinner /></div>;
  return <img src={url} alt={t('depots.barcode_alt')} className="h-[90px] w-full object-contain" />;
}

export default function MesDepotsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const sidebar = user?.role === 'admin' ? adminSidebar : particulierSidebar;
  const queryClient = useQueryClient();

  const STATUS_META: Record<string, { label: string; className: string; icon: ReactNode }> = {
    pending:   { label: t('depots.status_pending'),   className: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3.5 h-3.5" /> },
    approved:  { label: t('depots.status_approved'),  className: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3.5 h-3.5" /> },
    rejected:  { label: t('depots.status_rejected'),  className: 'bg-red-100 text-red-700',    icon: <XCircle className="w-3.5 h-3.5" /> },
    deposited: { label: t('depots.status_deposited'), className: 'bg-blue-100 text-blue-700',  icon: <Package className="w-3.5 h-3.5" /> },
  };

  const { data, isLoading } = useQuery({
    queryKey: ['my-container-requests'],
    queryFn: () => containerService.getMyRequests(),
  });
  const requests: ContainerRequest[] = data?.data ?? [];

  const confirmMutation = useMutation({
    mutationFn: (id: number) => containerService.confirmDeposit(id),
    onSuccess: () => {
      toast.success(t('depots.deposit_confirmed'));
      queryClient.invalidateQueries({ queryKey: ['my-container-requests'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || t('depots.confirm_error'));
    },
  });

  return (
    <DashboardLayout sidebarItems={sidebar} title={t('depots.title')}>
      <div className="max-w-2xl mx-auto">
        {isLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={<Package className="w-12 h-12" />}
            message={t('depots.empty')}
          />
        ) : (
          <div className="space-y-4">
            {requests.map((req) => {
              const meta = STATUS_META[req.status] ?? STATUS_META.pending;
              return (
                <div key={req.id} className="card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-gray-900">{req.object_title}</h3>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <MapPin className="w-3 h-3" />
                        <span>{req.container?.name}{req.slot_code ? ` · ${t('depots.slot')} ${req.slot_code}` : ''}</span>
                      </div>
                    </div>
                    <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${meta.className}`}>
                      {meta.icon}{meta.label}
                    </span>
                  </div>

                  {req.status === 'rejected' && req.reject_reason && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
                      {t('depots.reject_reason')} : {req.reject_reason}
                    </div>
                  )}

                  {(req.status === 'approved' || req.status === 'deposited') && (
                    <div className="mt-4 space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                        <KeyRound className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">{t('depots.access_code')}</p>
                          <p className="font-mono font-bold text-lg text-[#2D5016] tracking-widest">{req.access_code}</p>
                        </div>
                      </div>

                      <div className="p-4 border border-gray-200 rounded-xl">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                          <ScanBarcode className="w-3.5 h-3.5" />
                          {t('depots.barcode_label')}
                        </div>
                        <BarcodeImage requestId={req.id} />
                        <p className="text-center font-mono text-sm text-gray-600 mt-1">{req.barcode}</p>
                      </div>

                      {req.status === 'approved' && (
                        <button
                          type="button"
                          onClick={() => confirmMutation.mutate(req.id)}
                          disabled={confirmMutation.isPending}
                          className="btn-primary w-full"
                        >
                          {confirmMutation.isPending ? t('depots.confirming') : t('depots.confirm_deposit')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
