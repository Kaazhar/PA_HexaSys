import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, X, Check, Plus } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminSidebar } from '../../config/sidebars';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { adminPlanService } from '../../services/api';
import type { SubscriptionPlan } from '../../types';
import toast from 'react-hot-toast';

const emptyPlan: Partial<SubscriptionPlan> = {
  name: '',
  slug: '',
  price: 0,
  max_listings_bonus: 0,
  features: '',
  is_active: true,
  sort_order: 0,
  duration_days: 30,
};

const parseFeatures = (raw: string): string[] => {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return raw.split(',').map(f => f.trim()).filter(Boolean); }
};

export default function AdminSubscriptionPlans() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Partial<SubscriptionPlan> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [featureItems, setFeatureItems] = useState<string[]>([]);

  const openModal = (plan: Partial<SubscriptionPlan>, isNewPlan: boolean) => {
    setEditing({ ...plan });
    setIsNew(isNewPlan);
    setFeatureItems(parseFeatures(plan.features ?? ''));
  };

  const closeModal = () => {
    setEditing(null);
    setIsNew(false);
    setFeatureItems([]);
  };

  const syncFeatures = (items: string[]) => {
    setFeatureItems(items);
    setEditing(p => p ? ({ ...p, features: JSON.stringify(items.filter(f => f.trim())) }) : p);
  };

  const addFeature = () => syncFeatures([...featureItems, '']);
  const updateFeature = (i: number, val: string) => {
    const next = [...featureItems];
    next[i] = val;
    syncFeatures(next);
  };
  const removeFeature = (i: number) => syncFeatures(featureItems.filter((_, idx) => idx !== i));

  const { data, isLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: () => adminPlanService.getAll(),
  });

  const plans = data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (d: Partial<SubscriptionPlan>) => adminPlanService.create(d),
    onSuccess: () => { toast.success('Plan créé'); queryClient.invalidateQueries({ queryKey: ['admin-plans'] }); closeModal(); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Erreur'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SubscriptionPlan> }) => adminPlanService.update(id, data),
    onSuccess: () => { toast.success('Plan mis à jour'); queryClient.invalidateQueries({ queryKey: ['admin-plans'] }); closeModal(); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminPlanService.delete(id),
    onSuccess: () => { toast.success('Plan supprimé'); queryClient.invalidateQueries({ queryKey: ['admin-plans'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Erreur'),
  });

  const handleSave = () => {
    if (!editing) return;
    if (isNew) {
      createMutation.mutate(editing);
    } else if (editing.id) {
      updateMutation.mutate({ id: editing.id, data: editing });
    }
  };

  return (
    <DashboardLayout sidebarItems={adminSidebar} title="Plans d'abonnement">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Plans d'abonnement</h1>
          <button
            onClick={() => openModal({ ...emptyPlan }, true)}
            className="btn-primary"
          >
            Nouveau plan
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase">
                  <th className="pb-2 pr-4">Nom</th>
                  <th className="pb-2 pr-4">Slug</th>
                  <th className="pb-2 pr-4">Prix</th>
                  <th className="pb-2 pr-4">+Annonces</th>
                  <th className="pb-2 pr-4">Durée (j)</th>
                  <th className="pb-2 pr-4">Actif</th>
                  <th className="pb-2 pr-4">Ordre</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-50">
                    <td className="py-3 pr-4 font-medium text-gray-900">{plan.name}</td>
                    <td className="py-3 pr-4 text-gray-500 font-mono text-xs">{plan.slug}</td>
                    <td className="py-3 pr-4">{plan.price === 0 ? 'Gratuit' : `${plan.price}€/mois`}</td>
                    <td className="py-3 pr-4">+{plan.max_listings_bonus}</td>
                    <td className="py-3 pr-4">{plan.duration_days}j</td>
                    <td className="py-3 pr-4">
                      {plan.is_active
                        ? <span className="text-green-600 font-medium">Oui</span>
                        : <span className="text-gray-400">Non</span>}
                    </td>
                    <td className="py-3 pr-4 text-gray-500">{plan.sort_order}</td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openModal({ ...plan }, false)} className="p-1.5 text-gray-400 hover:text-primary-600 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteMutation.mutate(plan.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold">{isNew ? 'Créer un plan' : 'Modifier le plan'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Nom</label>
                  <input className="input w-full" value={editing.name ?? ''} onChange={e => setEditing(p => ({ ...p!, name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Slug</label>
                  <input className="input w-full font-mono" value={editing.slug ?? ''} onChange={e => setEditing(p => ({ ...p!, slug: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Prix (€/mois)</label>
                  <input type="number" min="0" step="0.01" className="input w-full" value={editing.price ?? 0} onChange={e => setEditing(p => ({ ...p!, price: parseFloat(e.target.value) }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">+Annonces bonus</label>
                  <input type="number" min="0" className="input w-full" value={editing.max_listings_bonus ?? 0} onChange={e => setEditing(p => ({ ...p!, max_listings_bonus: parseInt(e.target.value) }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Durée (jours)</label>
                  <input type="number" min="1" className="input w-full" value={editing.duration_days ?? 30} onChange={e => setEditing(p => ({ ...p!, duration_days: parseInt(e.target.value) }))} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-600">Fonctionnalités</label>
                  <button type="button" onClick={addFeature} className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium">
                    <Plus className="w-3.5 h-3.5" /> Ajouter
                  </button>
                </div>
                <div className="space-y-2">
                  {featureItems.length === 0 && (
                    <p className="text-xs text-gray-400 italic py-2">Aucune fonctionnalité — cliquez sur "Ajouter"</p>
                  )}
                  {featureItems.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        className="input flex-1 text-sm"
                        value={f}
                        onChange={e => updateFeature(i, e.target.value)}
                        placeholder={`Fonctionnalité ${i + 1}`}
                      />
                      <button type="button" onClick={() => removeFeature(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Ordre d'affichage</label>
                  <input type="number" min="0" className="input w-full" value={editing.sort_order ?? 0} onChange={e => setEditing(p => ({ ...p!, sort_order: parseInt(e.target.value) }))} />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editing.is_active ?? true} onChange={e => setEditing(p => ({ ...p!, is_active: e.target.checked }))} className="w-4 h-4 rounded accent-primary-600" />
                    <span className="text-sm text-gray-700">Plan actif</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button onClick={closeModal} className="btn-secondary">Annuler</button>
              <button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary flex items-center gap-2">
                <Check className="w-4 h-4" />
                {isNew ? 'Créer' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
