import { useState } from 'react';
import { BookOpen, Calendar, Plus, MapPin, Users, Clock, X, Loader2, AlertCircle } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salarieService, workshopService, categoryService } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { salarieSidebar } from '../../config/sidebars';

const statusConfig: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Brouillon', cls: 'badge-gray' },
  pending: { label: 'En attente', cls: 'badge-orange' },
  active: { label: 'Actif', cls: 'badge-green' },
  cancelled: { label: 'Annulé', cls: 'badge-red' },
};

const typeLabels: Record<string, string> = {
  atelier: 'Atelier',
  formation: 'Formation',
  conference: 'Conférence',
};

interface WorkshopForm {
  title: string;
  description: string;
  date: string;
  duration: string;
  location: string;
  price: string;
  max_spots: string;
  min_spots: string;
  type: string;
  category_id: string;
}

const defaultForm: WorkshopForm = {
  title: '', description: '', date: '', duration: '120',
  location: '', price: '0', max_spots: '15', min_spots: '10',
  type: 'atelier', category_id: '',
};

export default function SalarieFormations() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [form, setForm] = useState<WorkshopForm>(defaultForm);

  const { data, isLoading } = useQuery({
    queryKey: ['salarie', 'workshops'],
    queryFn: () => salarieService.getMyWorkshops(),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getAll(),
  });

  const workshops = data?.data || [];
  const categories = categoriesData?.data || [];

  const createMutation = useMutation({
    mutationFn: (d: Parameters<typeof workshopService.create>[0]) => workshopService.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salarie', 'workshops'] });
      setShowForm(false);
      setForm(defaultForm);
      toast.success('Formation créée, en attente de validation');
    },
    onError: () => toast.error('Erreur lors de la création'),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => workshopService.cancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salarie', 'workshops'] });
      setCancelId(null);
      setCancelReason('');
      toast.success('Formation annulée');
    },
    onError: () => toast.error('Erreur lors de l\'annulation'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      title: form.title,
      description: form.description,
      date: form.date,
      duration: Number(form.duration),
      location: form.location,
      price: Number(form.price),
      max_spots: Number(form.max_spots),
      min_spots: Number(form.min_spots),
      type: form.type,
      category_id: form.category_id ? Number(form.category_id) : undefined,
    } as Parameters<typeof workshopService.create>[0]);
  };

  return (
    <DashboardLayout sidebarItems={salarieSidebar} title="Espace Salarié">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Mes formations</h2>
            <p className="text-gray-500 text-sm mt-0.5">{workshops.length} formation{workshops.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Créer une formation
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : workshops.length === 0 ? (
          <div className="card text-center py-16 text-gray-400">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Aucune formation créée</p>
            <p className="text-sm mt-1">Créez votre première formation ou atelier</p>
          </div>
        ) : (
          <div className="space-y-3">
            {workshops.map((ws: { id: number; title: string; date: string; duration: number; location: string; enrolled: number; max_spots: number; min_spots: number; status: string; type: string; price: number; cancel_reason?: string }) => (
              <div key={ws.id} className="card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="font-semibold text-gray-900">{ws.title}</h3>
                      <span className="badge-gray text-xs">{typeLabels[ws.type] || ws.type}</span>
                      <span className={clsx('badge text-xs', statusConfig[ws.status]?.cls || 'badge-gray')}>
                        {statusConfig[ws.status]?.label || ws.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {ws.date ? format(new Date(ws.date), 'dd MMMM yyyy à HH:mm', { locale: fr }) : '-'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {ws.duration} min
                      </span>
                      {ws.location && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" />
                          {ws.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        {ws.enrolled}/{ws.max_spots} inscrits
                        {ws.enrolled < ws.min_spots && (
                          <span className="text-amber-500 text-xs">(min {ws.min_spots})</span>
                        )}
                      </span>
                    </div>
                    {ws.cancel_reason && (
                      <div className="flex items-start gap-1.5 mt-2 text-xs text-red-600">
                        <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span>Annulé : {ws.cancel_reason}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-bold text-primary-500">{ws.price === 0 ? 'Gratuit' : `${ws.price}€`}</span>
                    {ws.status !== 'cancelled' && (
                      <button
                        onClick={() => setCancelId(ws.id)}
                        className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 px-2 py-1 rounded-lg transition-colors"
                      >
                        Annuler
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">Créer une formation</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Titre *</label>
                <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input min-h-[80px] resize-y" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Type</label>
                  <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="atelier">Atelier</option>
                    <option value="formation">Formation</option>
                    <option value="conference">Conférence</option>
                  </select>
                </div>
                <div>
                  <label className="label">Catégorie</label>
                  <select className="input" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                    <option value="">— Aucune —</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Date et heure *</label>
                  <input type="datetime-local" className="input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Durée (min)</label>
                  <input type="number" className="input" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} min="15" />
                </div>
              </div>
              <div>
                <label className="label">Lieu</label>
                <input className="input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Prix (€)</label>
                  <input type="number" className="input" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} min="0" step="0.5" />
                </div>
                <div>
                  <label className="label">Places max</label>
                  <input type="number" className="input" value={form.max_spots} onChange={e => setForm(f => ({ ...f, max_spots: e.target.value }))} min="1" />
                </div>
                <div>
                  <label className="label">Places min</label>
                  <input type="number" className="input" value={form.min_spots} onChange={e => setForm(f => ({ ...f, min_spots: e.target.value }))} min="1" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Annuler</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary flex items-center gap-2">
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel modal */}
      {cancelId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-gray-900 mb-3">Annuler la formation</h3>
            <p className="text-sm text-gray-500 mb-4">Les participants inscrits seront notifiés automatiquement.</p>
            <textarea
              className="input w-full mb-4 min-h-[80px]"
              placeholder="Raison de l'annulation..."
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setCancelId(null); setCancelReason(''); }} className="btn-secondary">Retour</button>
              <button
                disabled={!cancelReason.trim() || cancelMutation.isPending}
                onClick={() => cancelMutation.mutate({ id: cancelId, reason: cancelReason })}
                className="btn-primary bg-red-500 hover:bg-red-600 flex items-center gap-2 disabled:opacity-50"
              >
                {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Confirmer l'annulation
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
