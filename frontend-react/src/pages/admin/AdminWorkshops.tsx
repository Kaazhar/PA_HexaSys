import { useState } from 'react';
import { LayoutDashboard, Users, Tag, BookOpen, Package, DollarSign, FolderOpen, Plus, CheckCircle, Calendar, MapPin } from 'lucide-react';
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

const sidebarItems = [
  { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Utilisateurs', path: '/admin/utilisateurs', icon: <Users className="w-4 h-4" /> },
  { label: 'Annonces', path: '/admin/annonces', icon: <Tag className="w-4 h-4" /> },
  { label: 'Formations', path: '/admin/formations', icon: <BookOpen className="w-4 h-4" /> },
  { label: 'Catégories', path: '/admin/categories', icon: <FolderOpen className="w-4 h-4" /> },
  { label: 'Conteneurs', path: '/admin/conteneurs', icon: <Package className="w-4 h-4" /> },
  { label: 'Finance', path: '/admin/finance', icon: <DollarSign className="w-4 h-4" /> },
];

const statusConfig = {
  draft: { label: 'Brouillon', class: 'badge-gray' },
  pending: { label: 'En attente', class: 'badge-orange' },
  active: { label: 'Actif', class: 'badge-green' },
  cancelled: { label: 'Annulé', class: 'badge-red' },
};

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

  return (
    <DashboardLayout sidebarItems={sidebarItems} title="Gestion des formations">
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
                {s === '' ? 'Toutes' : statusConfig[s as keyof typeof statusConfig]?.label || s}
              </button>
            ))}
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 whitespace-nowrap">
            <Plus className="w-4 h-4" /> Nouvelle formation
          </button>
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
                        <span className={clsx('badge', statusConfig[workshop.status as keyof typeof statusConfig]?.class || 'badge-gray')}>
                          {statusConfig[workshop.status as keyof typeof statusConfig]?.label || workshop.status}
                        </span>
                      </td>
                      <td className="table-cell">
                        {workshop.status === 'pending' && (
                          <button
                            onClick={() => validateMutation.mutate(workshop.id)}
                            disabled={validateMutation.isPending}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Valider
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {workshops.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Aucune formation trouvée</p>
                </div>
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
      </div>
    </DashboardLayout>
  );
}
