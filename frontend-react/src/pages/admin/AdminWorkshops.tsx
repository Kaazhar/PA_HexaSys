import { useState } from 'react';
import { BookOpen, Plus, CheckCircle, Calendar, MapPin, XCircle, Trash2, RefreshCw } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/common/Modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workshopService, categoryService } from '../../services/api';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import type { Workshop } from '../../types';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import clsx from 'clsx';
import { adminSidebar } from '../../config/sidebars';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import { workshopStatuses } from '../../config/statuses';

const typeLabels: Record<string, string> = {
  atelier: 'Atelier',
  formation: 'Formation',
  conference: 'Conférence',
};

interface CreateWorkshopForm {
  title: string;
  description: string;
  date: string;
  duration: number;
  location: string;
  price: number;
  max_spots: number;
  category_id: number;
  type: string;
}

export default function AdminWorkshops() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);
  const [cancelWorkshop, setCancelWorkshop] = useState<Workshop | null>(null);
  const [deleteWorkshopId, setDeleteWorkshopId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'workshops', { status: statusFilter, page }],
    queryFn: () => workshopService.getAdminAll({ status: statusFilter, page, limit: 15 }),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getAll(),
  });

  const workshops = data?.data?.workshops || [];
  const total = data?.data?.total || 0;
  const categories = categoriesData?.data || [];

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateWorkshopForm>({
    defaultValues: { type: 'atelier', max_spots: 15, price: 0 },
  });

  const validateMutation = useMutation({
    mutationFn: (id: number) => workshopService.validate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workshops'] });
      toast.success('Formation validée !');
    },
    onError: () => toast.error('Erreur lors de la validation'),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateWorkshopForm) => workshopService.create({
      ...data,
      date: new Date(data.date).toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workshops'] });
      setShowCreate(false);
      reset();
      toast.success('Formation créée !');
    },
    onError: () => toast.error('Erreur lors de la création'),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => workshopService.cancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workshops'] });
      setCancelWorkshop(null);
      setCancelReason('');
      toast.success('Événement annulé, participants notifiés');
    },
    onError: () => toast.error('Erreur lors de l\'annulation'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => workshopService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workshops'] });
      setDeleteWorkshopId(null);
      toast.success('Événement supprimé, participants notifiés');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const checkEnrollmentMutation = useMutation({
    mutationFn: () => workshopService.checkEnrollment(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workshops'] });
      toast.success(res.data.message || 'Vérification terminée');
    },
    onError: () => toast.error('Erreur lors de la vérification'),
  });

  return (
    <DashboardLayout sidebarItems={adminSidebar} title="Gestion des formations">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="flex gap-2 flex-wrap">
            {['', 'pending', 'active', 'draft', 'cancelled'].map((s) => (
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
                {s === '' ? 'Toutes' : workshopStatuses[s]?.label || s}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => checkEnrollmentMutation.mutate()}
              disabled={checkEnrollmentMutation.isPending}
              className="btn-secondary flex items-center gap-2 whitespace-nowrap"
              title="Annule automatiquement les événements dans les 48h avec moins de participants que le minimum"
            >
              <RefreshCw className={clsx('w-4 h-4', checkEnrollmentMutation.isPending && 'animate-spin')} />
              Vérifier inscriptions
            </button>
            <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 whitespace-nowrap">
              <Plus className="w-4 h-4" /> Nouvelle formation
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm text-gray-500">{total} formation{total > 1 ? 's' : ''}</p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><LoadingSpinner /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="table-header">Formation</th>
                    <th className="table-header">Type</th>
                    <th className="table-header">Date</th>
                    <th className="table-header">Lieu</th>
                    <th className="table-header">Places</th>
                    <th className="table-header">Prix</th>
                    <th className="table-header">Inscriptions</th>
                    <th className="table-header">Statut</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {workshops.map((workshop: Workshop) => (
                    <tr key={workshop.id} className="hover:bg-gray-50 transition-colors">
                      <td className="table-cell">
                        <p className="font-medium text-gray-900 line-clamp-1">{workshop.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{workshop.instructor ? `${workshop.instructor.firstname} ${workshop.instructor.lastname}` : ''}</p>
                      </td>
                      <td className="table-cell">
                        <span className="badge-blue">{typeLabels[workshop.type] || workshop.type}</span>
                      </td>
                      <td className="table-cell text-gray-500 text-xs">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {workshop.date ? format(new Date(workshop.date), 'dd MMM yyyy', { locale: fr }) : '-'}
                        </div>
                      </td>
                      <td className="table-cell text-gray-500 text-xs">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {workshop.location}
                        </div>
                      </td>
                      <td className="table-cell text-gray-700">
                        <span className={clsx('text-sm', workshop.enrolled >= workshop.max_spots ? 'text-red-500 font-medium' : '')}>
                          {workshop.enrolled}/{workshop.max_spots}
                        </span>
                      </td>
                      <td className="table-cell font-medium text-gray-700">
                        {workshop.price === 0 ? 'Gratuit' : `${workshop.price}€`}
                      </td>
                      <td className="table-cell">
                        <div className="text-sm">
                          <span className={clsx('font-medium', workshop.enrolled < (workshop.min_spots || 10) ? 'text-orange-500' : 'text-gray-700')}>
                            {workshop.enrolled}/{workshop.max_spots}
                          </span>
                          <p className="text-xs text-gray-400">min. {workshop.min_spots || 10}</p>
                        </div>
                      </td>
                      <td className="table-cell">
                        <StatusBadge status={workshop.status} config={workshopStatuses} />
                        {workshop.cancel_reason && (
                          <p className="text-xs text-gray-400 mt-0.5 max-w-[140px] truncate" title={workshop.cancel_reason}>
                            {workshop.cancel_reason}
                          </p>
                        )}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1.5">
                          {workshop.status === 'pending' && (
                            <button
                              onClick={() => validateMutation.mutate(workshop.id)}
                              disabled={validateMutation.isPending}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Valider
                            </button>
                          )}
                          {workshop.status !== 'cancelled' && (
                            <button
                              onClick={() => setCancelWorkshop(workshop)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Annuler
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteWorkshopId(workshop.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Supprimer définitivement"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {workshops.length === 0 && (
                <EmptyState icon={<BookOpen className="w-10 h-10" />} message="Aucune formation trouvée" />
              )}
            </div>
          )}
        </div>

        {/* Create Modal */}
        <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); reset(); }} title="Créer une formation" size="lg">
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div>
              <label className="label">Titre</label>
              <input {...register('title', { required: true })} className="input" placeholder="Atelier upcycling textile" />
              {errors.title && <p className="text-red-500 text-xs mt-1">Requis</p>}
            </div>
            <div>
              <label className="label">Description</label>
              <textarea {...register('description')} className="input min-h-[80px] resize-none" placeholder="Description de la formation..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Date et heure</label>
                <input {...register('date', { required: true })} type="datetime-local" className="input" />
                {errors.date && <p className="text-red-500 text-xs mt-1">Requis</p>}
              </div>
              <div>
                <label className="label">Durée (minutes)</label>
                <input {...register('duration', { valueAsNumber: true })} type="number" className="input" placeholder="120" />
              </div>
            </div>
            <div>
              <label className="label">Lieu</label>
              <input {...register('location')} className="input" placeholder="Atelier Paris 11e" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Prix (€)</label>
                <input {...register('price', { valueAsNumber: true })} type="number" step="0.01" className="input" placeholder="0" />
              </div>
              <div>
                <label className="label">Places max</label>
                <input {...register('max_spots', { valueAsNumber: true })} type="number" className="input" placeholder="15" />
              </div>
              <div>
                <label className="label">Type</label>
                <select {...register('type')} className="input">
                  <option value="atelier">Atelier</option>
                  <option value="formation">Formation</option>
                  <option value="conference">Conférence</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Catégorie</label>
              <select {...register('category_id', { valueAsNumber: true })} className="input">
                <option value={0}>Sélectionner une catégorie</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setShowCreate(false); reset(); }} className="btn-secondary flex-1">Annuler</button>
              <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1">
                {createMutation.isPending ? 'Création...' : 'Créer'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Cancel Modal */}
        <Modal isOpen={!!cancelWorkshop} onClose={() => { setCancelWorkshop(null); setCancelReason(''); }} title="Annuler l'événement" size="sm">
          <p className="text-sm text-gray-600 mb-3">
            Tous les participants inscrits à <strong>{cancelWorkshop?.title}</strong> seront notifiés.
          </p>
          <div className="mb-4">
            <label className="label">Raison de l'annulation</label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="input resize-none min-h-[80px]"
              placeholder="Manque de participants, problème logistique..."
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setCancelWorkshop(null); setCancelReason(''); }} className="btn-secondary flex-1">Fermer</button>
            <button
              onClick={() => cancelWorkshop && cancelReason.trim() && cancelMutation.mutate({ id: cancelWorkshop.id, reason: cancelReason })}
              disabled={cancelMutation.isPending || !cancelReason.trim()}
              className="btn-danger flex-1"
            >
              {cancelMutation.isPending ? 'Annulation...' : 'Confirmer'}
            </button>
          </div>
        </Modal>

        {/* Delete Modal */}
        <Modal isOpen={!!deleteWorkshopId} onClose={() => setDeleteWorkshopId(null)} title="Supprimer l'événement" size="sm">
          <p className="text-gray-600 mb-5">
            Cet événement sera supprimé définitivement et tous les inscrits seront notifiés. Cette action est irréversible.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteWorkshopId(null)} className="btn-secondary flex-1">Annuler</button>
            <button
              onClick={() => deleteWorkshopId && deleteMutation.mutate(deleteWorkshopId)}
              disabled={deleteMutation.isPending}
              className="btn-danger flex-1"
            >
              {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
