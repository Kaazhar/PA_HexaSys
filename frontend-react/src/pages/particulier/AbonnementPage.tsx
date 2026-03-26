import { CheckCircle, Zap, Star, Building2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { subscriptionService } from '../../services/api';
import clsx from 'clsx';
import { useState } from 'react';

const plans = [
  {
    id: 'decouverte',
    name: 'Découverte',
    price: 0,
    icon: <Zap className="w-6 h-6" />,
    color: 'border-gray-200',
    features: [
      'Annonces limitées (5/mois)',
      'Accès aux formations publiques',
      'Score upcycling de base',
      'Messagerie basique',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    icon: <Star className="w-6 h-6 text-amber-500" />,
    color: 'border-primary-400 ring-2 ring-primary-200',
    popular: true,
    features: [
      'Annonces illimitées',
      'Priorité dans les résultats',
      'Vérification SIRET',
      'Statistiques avancées',
      'Accès aux projets upcycling',
      'Support prioritaire',
    ],
  },
  {
    id: 'enterprise',
    name: 'Entreprise',
    price: 99,
    icon: <Building2 className="w-6 h-6 text-purple-500" />,
    color: 'border-purple-200',
    features: [
      'Tout le plan Pro',
      'Plusieurs comptes collaborateurs',
      'API d\'intégration',
      'Tableau de bord entreprise',
      'Gestionnaire de compte dédié',
      'Factures personnalisées',
    ],
  },
];

export default function AbonnementPage() {
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => subscriptionService.getMy(),
  });

  const sub = data?.data;

  const upgradeMutation = useMutation({
    mutationFn: (plan: string) => subscriptionService.upgrade(plan),
    onSuccess: () => {
      setConfirmed(true);
      setSelectedPlan(null);
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mon abonnement</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gérez votre abonnement et accédez à plus de fonctionnalités</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        ) : (
          <>
            {/* Current plan */}
            {sub && (
              <div className="card bg-primary-50 border-primary-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Abonnement actuel</p>
                    <p className="text-lg font-semibold text-primary-700 capitalize mt-0.5">{sub.plan}</p>
                    {sub.renewal_date && (
                      <p className="text-xs text-gray-500 mt-1">Renouvellement le {new Date(sub.renewal_date).toLocaleDateString('fr-FR')}</p>
                    )}
                  </div>
                  <CheckCircle className="w-8 h-8 text-primary-500" />
                </div>
              </div>
            )}

            {confirmed && (
              <div className="card bg-green-50 border-green-100 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <p className="text-sm text-green-700 font-medium">Votre abonnement a été mis à jour !</p>
              </div>
            )}

            {/* Plans */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {plans.map((plan) => {
                const isCurrent = sub?.plan === plan.id;
                return (
                  <div key={plan.id} className={clsx('card relative border-2 transition-all', plan.color)}>
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-primary-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                          Populaire
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                        {plan.icon}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{plan.name}</p>
                        <p className="text-lg font-bold text-gray-900">
                          {plan.price === 0 ? 'Gratuit' : `${plan.price}€/mois`}
                        </p>
                      </div>
                    </div>

                    <ul className="space-y-2 mb-5">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <CheckCircle className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    {isCurrent ? (
                      <button disabled className="btn-primary w-full opacity-60 cursor-not-allowed">
                        Plan actuel
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedPlan(plan.id)}
                        className={clsx('w-full py-2 rounded-md text-sm font-medium transition-colors',
                          plan.popular
                            ? 'bg-primary-500 text-white hover:bg-primary-600'
                            : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                        )}
                      >
                        {plan.price === 0 ? 'Choisir' : 'Souscrire'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Confirm modal */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Changer vers le plan {plans.find(p => p.id === selectedPlan)?.name} ?
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              {plans.find(p => p.id === selectedPlan)?.price === 0
                ? 'Vous passerez sur le plan gratuit.'
                : `Vous serez facturé ${plans.find(p => p.id === selectedPlan)?.price}€/mois.`}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setSelectedPlan(null)} className="btn-secondary">Annuler</button>
              <button
                onClick={() => upgradeMutation.mutate(selectedPlan)}
                disabled={upgradeMutation.isPending}
                className="btn-primary"
              >
                {upgradeMutation.isPending ? 'Changement...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
