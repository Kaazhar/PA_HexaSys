import { useState } from 'react';
import { Package, Plus, CheckCircle, XCircle, MapPin, Grid3x3 } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/common/Modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { containerService } from '../../services/api';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import type { ContainerRequest, ContainerSlot, Container } from '../../types';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import clsx from 'clsx';
import { adminSidebar } from '../../config/sidebars';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import { containerStatuses, containerRequestStatuses } from '../../config/statuses';
import { useTranslation } from 'react-i18next';

interface CreateContainerForm {
  name: string;
  address: string;
  district: string;
  capacity: number;
}

const slotStatusStyle: Record<string, string> = {
  free: 'border-gray-200 bg-white text-gray-600',
  reserved: 'border-amber-300 bg-amber-50 text-amber-600',
  occupied: 'border-red-300 bg-red-50 text-red-600',
};

function SlotsModal({ container, onClose }: { container: Container; onClose: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['container-slots', container.id],
    queryFn: () => containerService.getSlots(container.id),
  });
  const slots: ContainerSlot[] = data?.data || [];

  const { register, handleSubmit, reset } = useForm({ defaultValues: { S: 0, M: 0, L: 0 } });

  const seedMutation = useMutation({
    mutationFn: (counts: { S: number; M: number; L: number }) =>
      containerService.seedSlots(container.id, counts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['container-slots', container.id] });
      reset({ S: 0, M: 0, L: 0 });
      toast.success(t('admin_containers.slots_added'));
    },
    onError: () => toast.error(t('admin_containers.slots_error')),
  });

  const bySize = (size: string) => slots.filter(s => s.size === size);
  const freeOf = (size: string) => bySize(size).filter(s => s.status === 'free').length;

  return (
    <Modal isOpen onClose={onClose} title={`Cases — ${container.name}`} size="lg">
      <div className="space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          {['S', 'M', 'L'].map(size => (
            <div key={size} className="p-3 bg-gray-50 rounded-xl text-center">
              <p className="text-lg font-bold text-gray-800">{size}</p>
              <p className="text-sm text-gray-500">{t('admin_containers.slots_free_count', { free: freeOf(size), total: bySize(size).length })}</p>
            </div>
          ))}
        </div>

        {/* Slot grid */}
        {isLoading ? (
          <div className="flex justify-center py-4"><LoadingSpinner /></div>
        ) : slots.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">{t('admin_containers.no_slots')}</p>
        ) : (
          <div className="space-y-3">
            {['S', 'M', 'L'].map(size => {
              const sizeSlots = bySize(size);
              if (sizeSlots.length === 0) return null;
              return (
                <div key={size}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('admin_containers.slot_size', { size })}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {sizeSlots.map(slot => (
                      <span
                        key={slot.id}
                        className={clsx('px-2.5 py-1.5 rounded-lg border-2 text-xs font-mono font-bold', slotStatusStyle[slot.status])}
                        title={slot.status}
                      >
                        {slot.slot_code}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-gray-400 pt-2 border-t border-gray-100">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-gray-200 bg-white" /> {t('admin_containers.legend_free')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-amber-300 bg-amber-50" /> {t('admin_containers.legend_reserved')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-red-300 bg-red-50" /> {t('admin_containers.legend_occupied')}</span>
            </div>
          </div>
        )}

        {/* Add slots form */}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">{t('admin_containers.add_slots')}</p>
          <form onSubmit={handleSubmit((d) => seedMutation.mutate({ S: Number(d.S), M: Number(d.M), L: Number(d.L) }))} className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {['S', 'M', 'L'].map(size => (
                <div key={size}>
                  <label className="label">{t('admin_containers.slot_size', { size })}</label>
                  <input
                    {...register(size as 'S' | 'M' | 'L', { valueAsNumber: true, min: 0 })}
                    type="number"
                    min="0"
                    className="input text-center"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
            <button type="submit" disabled={seedMutation.isPending} className="btn-primary w-full">
              {seedMutation.isPending ? t('admin_containers.adding') : t('admin_containers.add_slots_btn')}
            </button>
          </form>
        </div>
      </div>
    </Modal>
  );
}

export default function AdminContainers() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [slotsContainer, setSlotsContainer] = useState<Container | null>(null);
  const [rejectRequest, setRejectRequest] = useState<ContainerRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const { data: containersData, isLoading: containersLoading } = useQuery({
    queryKey: ['containers'],
    queryFn: () => containerService.getAll(),
  });

  const { data: requestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ['container-requests', statusFilter],
    queryFn: () => containerService.getRequests({ status: statusFilter || undefined }),
  });

  const containers = containersData?.data || [];
  const requests = requestsData?.data || [];

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateContainerForm>({
    defaultValues: { capacity: 25 },
  });
  const { register: registerReject, handleSubmit: handleRejectSubmit, reset: resetReject } = useForm<{ reason: string }>();

  const createMutation = useMutation({
    mutationFn: (data: CreateContainerForm) => containerService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] });
      setShowCreate(false);
      reset();
      toast.success(t('common.success'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const validateMutation = useMutation({
    mutationFn: (id: number) => containerService.validateRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['container-requests'] });
      toast.success(t('common.success'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => containerService.rejectRequest(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['container-requests'] });
      setRejectRequest(null);
      resetReject();
      toast.success(t('common.success'));
    },
  });

  return (
    <DashboardLayout sidebarItems={adminSidebar} title={t('admin_containers.title')}>
      <div className="space-y-8">
        {/* Containers grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{t('admin_containers.containers_count', { count: containers.length })}</h2>
            <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> {t('admin_containers.new')}
            </button>
          </div>

          {containersLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {containers.map((container) => {
                const fill = container.capacity > 0 ? Math.round((container.current_count / container.capacity) * 100) : 0;
                const fillColor = fill >= 90 ? 'bg-red-500' : fill >= 70 ? 'bg-amber-500' : 'bg-primary-500';

                return (
                  <div key={container.id} className="card">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{container.name}</h3>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                          <MapPin className="w-3 h-3" />
                          <span>{container.address}</span>
                        </div>
                      </div>
                      <StatusBadge status={container.status} config={containerStatuses} />
                    </div>

                    {/* Capacity gauge */}
                    <div className="mb-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{t('admin_containers.fill')}</span>
                        <span className="font-medium">{container.current_count}/{container.capacity} ({fill}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full transition-all ${fillColor}`}
                          style={{ width: `${Math.min(100, fill)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-gray-500">{container.district}</span>
                      <button
                        onClick={() => setSlotsContainer(container)}
                        className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
                      >
                        <Grid3x3 className="w-3.5 h-3.5" /> {t('admin_containers.manage_slots')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Requests table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{t('admin_containers.requests_title')}</h2>
            <div className="flex gap-2">
              {['', 'pending', 'approved', 'rejected'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    statusFilter === s
                      ? 'bg-primary-500 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {s === '' ? t('admin_containers.all') : containerRequestStatuses[s]?.label}
                </button>
              ))}
            </div>
          </div>

          {requestsLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="table-header">{t('admin_containers.col_requester')}</th>
                      <th className="table-header">{t('admin_containers.col_object')}</th>
                      <th className="table-header">{t('admin_containers.col_container')}</th>
                      <th className="table-header">{t('admin_containers.col_slot')}</th>
                      <th className="table-header">{t('admin_containers.col_date')}</th>
                      <th className="table-header">{t('admin_containers.col_status')}</th>
                      <th className="table-header">{t('admin_containers.col_actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {requests.map((req: ContainerRequest) => (
                      <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                        <td className="table-cell">
                          <p className="font-medium text-gray-900">
                            {req.user ? `${req.user.firstname} ${req.user.lastname}` : `User #${req.user_id}`}
                          </p>
                          <p className="text-xs text-gray-500">{req.user?.email}</p>
                        </td>
                        <td className="table-cell">
                          <p className="font-medium text-gray-900">{req.object_title}</p>
                          <p className="text-xs text-gray-500 line-clamp-1">{req.object_description}</p>
                        </td>
                        <td className="table-cell text-gray-500">{req.container?.name || `#${req.container_id}`}</td>
                        <td className="table-cell">
                          {req.slot_code ? (
                            <span className="font-mono text-xs font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded">
                              {req.slot_code}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                          {req.size_category && (
                            <span className="ml-1 text-xs text-gray-400">{req.size_category}</span>
                          )}
                        </td>
                        <td className="table-cell text-gray-500 text-xs">
                          {req.desired_date ? format(new Date(req.desired_date), 'dd MMM yyyy', { locale: fr }) : '-'}
                        </td>
                        <td className="table-cell">
                          <StatusBadge status={req.status} config={containerRequestStatuses} />
                        </td>
                        <td className="table-cell">
                          {req.status === 'pending' && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => validateMutation.mutate(req.id)}
                                disabled={validateMutation.isPending}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-green-500 hover:bg-green-50 transition-colors"
                                title="Approuver"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setRejectRequest(req)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="Refuser"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                          {req.status === 'approved' && req.access_code && (
                            <span className="text-xs text-green-600 font-mono font-bold">{req.access_code}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {requests.length === 0 && (
                  <EmptyState icon={<Package className="w-10 h-10" />} message={t('common.noData')} />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Create Container Modal */}
        <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); reset(); }} title={t('admin_containers.create_modal')} size="sm">
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div>
              <label className="label">{t('admin_containers.label_name')}</label>
              <input {...register('name', { required: true })} className="input" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{t('admin_users.form_required')}</p>}
            </div>
            <div>
              <label className="label">{t('admin_containers.label_address')}</label>
              <input {...register('address')} className="input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">{t('admin_containers.label_district')}</label>
                <input {...register('district')} className="input" />
              </div>
              <div>
                <label className="label">{t('admin_containers.label_capacity')}</label>
                <input {...register('capacity', { valueAsNumber: true, min: 1 })} type="number" min="1" className="input" placeholder="25" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setShowCreate(false); reset(); }} className="btn-secondary flex-1">{t('common.cancel')}</button>
              <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1">
                {createMutation.isPending ? t('admin_workshops.creating') : t('common.create')}
              </button>
            </div>
          </form>
        </Modal>

        {/* Slots Modal */}
        {slotsContainer && (
          <SlotsModal container={slotsContainer} onClose={() => setSlotsContainer(null)} />
        )}

        {/* Reject Modal */}
        <Modal isOpen={!!rejectRequest} onClose={() => { setRejectRequest(null); resetReject(); }} title={t('admin_containers.reject_modal')} size="sm">
          <form onSubmit={handleRejectSubmit((d) => rejectRequest && rejectMutation.mutate({ id: rejectRequest.id, reason: d.reason }))} className="space-y-4">
            <p className="text-sm text-gray-600"><strong>{rejectRequest?.user ? `${rejectRequest.user.firstname} ${rejectRequest.user.lastname}` : ''}</strong></p>
            <div>
              <label className="label">{t('admin_containers.reject_reason')}</label>
              <textarea {...registerReject('reason', { required: true })} className="input min-h-[80px] resize-none" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setRejectRequest(null); resetReject(); }} className="btn-secondary flex-1">{t('common.cancel')}</button>
              <button type="submit" disabled={rejectMutation.isPending} className="btn-danger flex-1">
                {rejectMutation.isPending ? t('admin_containers.refusing') : t('admin_containers.refuse_btn')}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
