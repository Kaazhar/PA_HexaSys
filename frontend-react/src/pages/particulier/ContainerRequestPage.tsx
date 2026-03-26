import { Package, MapPin, CheckCircle } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useQuery, useMutation } from '@tanstack/react-query';
import { containerService } from '../../services/api';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import clsx from 'clsx';
import { particulierSidebar } from '../../config/sidebars';

interface ContainerRequestForm {
  container_id: number;
  object_title: string;
  object_description: string;
  desired_date: string;
}

export default function ContainerRequestPage() {
  const navigate = useNavigate();

  const { data: containersData, isLoading: containersLoading } = useQuery({
    queryKey: ['containers'],
    queryFn: () => containerService.getAll(),
  });

  const containers = (containersData?.data || []).filter((c) => c.status === 'operational');

  const { register, handleSubmit, watch, formState: { errors } } = useForm<ContainerRequestForm>();
  const selectedContainerId = watch('container_id');
  const selectedContainer = containers.find(c => c.id === Number(selectedContainerId));

  const createMutation = useMutation({
    mutationFn: (data: ContainerRequestForm) => containerService.createRequest({
      ...data,
      container_id: Number(data.container_id),
    }),
    onSuccess: () => {
      toast.success('Demande de dépôt envoyée ! Vous recevrez une confirmation par notification.');
      navigate('/dashboard');
    },
    onError: () => toast.error('Erreur lors de l\'envoi de la demande'),
  });

  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 3);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  return (
    <DashboardLayout sidebarItems={particulierSidebar} title="Demande de dépôt en conteneur">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Info */}
        <div className="card bg-primary-50 border border-primary-100">
          <div className="flex gap-3">
            <Package className="w-6 h-6 text-primary-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-primary-700 mb-1">Comment ça marche ?</h3>
              <ul className="text-sm text-primary-600 space-y-1">
                <li>1. Choisissez un conteneur disponible près de chez vous</li>
                <li>2. Décrivez l'objet que vous souhaitez déposer</li>
                <li>3. Sélectionnez une date de dépôt</li>
                <li>4. Recevez votre code d'accès par notification après validation</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Containers selection */}
        {containersLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : (
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Sélectionner un conteneur</h2>
            <div className="space-y-3">
              {containers.map((container) => {
                const fill = Math.round((container.current_count / container.capacity) * 100);
                const isFull = container.current_count >= container.capacity;
                return (
                  <label key={container.id} className={clsx(
                    'flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all',
                    Number(selectedContainerId) === container.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300',
                    isFull && 'opacity-50 cursor-not-allowed'
                  )}>
                    <input
                      {...register('container_id', { required: true })}
                      type="radio"
                      value={container.id}
                      disabled={isFull}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900">{container.name}</p>
                        <span className={clsx('badge', isFull ? 'badge-red' : 'badge-green')}>
                          {isFull ? 'Plein' : 'Disponible'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <MapPin className="w-3 h-3" />
                        <span>{container.address}, {container.district}</span>
                      </div>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Remplissage</span>
                          <span>{container.current_count}/{container.capacity}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className={clsx('h-1.5 rounded-full', fill >= 90 ? 'bg-red-500' : fill >= 70 ? 'bg-amber-500' : 'bg-primary-500')}
                            style={{ width: `${Math.min(100, fill)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
            {errors.container_id && <p className="text-red-500 text-xs mt-2">Veuillez sélectionner un conteneur</p>}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="card space-y-5">
          <h2 className="font-semibold text-gray-900">Informations sur l'objet</h2>

          <div>
            <label className="label">Nom de l'objet *</label>
            <input
              {...register('object_title', { required: 'Nom requis' })}
              className="input"
              placeholder="Ex: Chaise en bois"
            />
            {errors.object_title && <p className="text-red-500 text-xs mt-1">{errors.object_title.message}</p>}
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              {...register('object_description')}
              className="input min-h-[100px] resize-none"
              placeholder="Décrivez l'objet (dimensions, état, matériaux...)"
            />
          </div>

          <div>
            <label className="label">Date de dépôt souhaitée *</label>
            <input
              {...register('desired_date', { required: 'Date requise' })}
              type="date"
              min={today}
              max={maxDateStr}
              className="input"
            />
            {errors.desired_date && <p className="text-red-500 text-xs mt-1">{errors.desired_date.message}</p>}
          </div>

          {selectedContainer && (
            <div className="p-4 bg-green-50 rounded-xl border border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-green-700">Conteneur sélectionné</span>
              </div>
              <p className="text-sm text-green-600">{selectedContainer.name} — {selectedContainer.address}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={createMutation.isPending || !containers.length}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2"
          >
            {createMutation.isPending ? 'Envoi...' : 'Envoyer la demande'}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
