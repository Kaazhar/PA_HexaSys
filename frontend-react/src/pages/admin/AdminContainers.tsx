import { useState } from 'react';
import { LayoutDashboard, Users, Tag, BookOpen, Package, DollarSign, Settings, Plus, CheckCircle, XCircle, MapPin } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/common/Modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { containerService } from '../../services/api';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import type { ContainerRequest } from '../../types';
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

interface CreateContainerForm {
  name: string;
  address: string;
  district: string;
  capacity: number;
}

export default function AdminContainers() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
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
      toast.success('Conteneur créé !');
    },
    onError: () => toast.error('Erreur lors de la création'),
  });

  const validateMutation = useMutation({
    mutationFn: (id: number) => containerService.validateRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['container-requests'] });
      toast.success('Demande approuvée !');
    },
    onError: () => toast.error('Erreur lors de la validation'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => containerService.rejectRequest(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['container-requests'] });
      setRejectRequest(null);
      resetReject();
      toast.success('Demande refusée');
    },
  });

  const statusConfig = {
    operational: { label: 'Opérationnel', class: 'badge-green' },
    full: { label: 'Plein', class: 'badge-orange' },
    maintenance: { label: 'Maintenance', class: 'badge-red' },
  };

  const requestStatusConfig = {
    pending: { label: 'En attente', class: 'badge-orange' },
    approved: { label: 'Approuvée', class: 'badge-green' },
    rejected: { label: 'Refusée', class: 'badge-red' },
  };

  return (
    <DashboardLayout sidebarItems={sidebarItems} title="Gestion des conteneurs">
      <div className="space-y-8">
        {/* Containers grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Conteneurs ({containers.length})</h2>
            <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nouveau conteneur
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
                      <span className={clsx('badge', statusConfig[container.status as keyof typeof statusConfig]?.class || 'badge-gray')}>
                        {statusConfig[container.status as keyof typeof statusConfig]?.label || container.status}
                      </span>
                    </div>

                    {/* Capacity gauge */}
                    <div className="mb-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Remplissage</span>
                        <span className="font-medium">{container.current_count}/{container.capacity} ({fill}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full transition-all ${fillColor}`}
                          style={{ width: `${Math.min(100, fill)}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 mt-2">
                      <span className="font-medium">Arrondissement :</span> {container.district}
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
            <h2 className="text-lg font-semibold text-gray-900">Demandes de dépôt</h2>
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
                  {s === '' ? 'Toutes' : requestStatusConfig[s as keyof typeof requestStatusConfig]?.label}
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
                      <th className="table-header">Demandeur</th>
                      <th className="table-header">Objet</th>
                      <th className="table-header">Conteneur</th>
                      <th className="table-header">Date souhaitée</th>
                      <th className="table-header">Statut</th>
                      <th className="table-header">Actions</th>
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
                        <td className="table-cell text-gray-500 text-xs">
                          {req.desired_date ? format(new Date(req.desired_date), 'dd MMM yyyy', { locale: fr }) : '-'}
                        </td>
                        <td className="table-cell">
                          <span className={clsx('badge', requestStatusConfig[req.status as keyof typeof requestStatusConfig]?.class || 'badge-gray')}>
                            {requestStatusConfig[req.status as keyof typeof requestStatusConfig]?.label || req.status}
                          </span>
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
                  <div className="text-center py-12 text-gray-400">
                    <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>Aucune demande trouvée</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Create Container Modal */}
        <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); reset(); }} title="Créer un conteneur" size="sm">
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div>
              <label className="label">Nom</label>
              <input {...register('name', { required: true })} className="input" placeholder="Conteneur République" />
              {errors.name && <p className="text-red-500 text-xs mt-1">Requis</p>}
            </div>
            <div>
              <label className="label">Adresse</label>
              <input {...register('address')} className="input" placeholder="Place de la République" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Arrondissement</label>
                <input {...register('district')} className="input" placeholder="75011" />
              </div>
              <div>
                <label className="label">Capacité</label>
                <input {...register('capacity', { valueAsNumber: true })} type="number" className="input" placeholder="25" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setShowCreate(false); reset(); }} className="btn-secondary flex-1">Annuler</button>
              <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1">
                {createMutation.isPending ? 'Création...' : 'Créer'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Reject Modal */}
        <Modal isOpen={!!rejectRequest} onClose={() => { setRejectRequest(null); resetReject(); }} title="Refuser la demande" size="sm">
          <form onSubmit={handleRejectSubmit((d) => rejectRequest && rejectMutation.mutate({ id: rejectRequest.id, reason: d.reason }))} className="space-y-4">
            <p className="text-sm text-gray-600">Demande de : <strong>{rejectRequest?.user ? `${rejectRequest.user.firstname} ${rejectRequest.user.lastname}` : ''}</strong></p>
            <div>
              <label className="label">Motif du refus</label>
              <textarea {...registerReject('reason', { required: true })} className="input min-h-[80px] resize-none" placeholder="Raison du refus..." />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setRejectRequest(null); resetReject(); }} className="btn-secondary flex-1">Annuler</button>
              <button type="submit" disabled={rejectMutation.isPending} className="btn-danger flex-1">
                {rejectMutation.isPending ? 'Refus...' : 'Refuser'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
