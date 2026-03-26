import { useState } from 'react';
import { Tag, Briefcase, CreditCard, ArrowRight, BadgeCheck, AlertCircle, Loader2, MapPin, Users, Calendar, TrendingUp, Building2 } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/common/StatCard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardService, siretService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { proSidebar } from '../../config/sidebars';

const planColors: Record<string, string> = {
  decouverte: 'badge-gray',
  pro: 'badge-blue',
  enterprise: 'badge-purple',
};

const planLabels: Record<string, string> = {
  decouverte: 'Découverte (Gratuit)',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

export default function DashboardPro() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [siretInput, setSiretInput] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'pro'],
    queryFn: () => dashboardService.getPro(),
  });

  const dashboard = data?.data;

  const { data: companyData, refetch: refetchCompany } = useQuery({
    queryKey: ['pro', 'company-info'],
    queryFn: () => siretService.getCompanyInfo(),
    enabled: !!user?.siret_verified,
    retry: false,
  });

  const companyInfo = companyData?.data;

  const siretMutation = useMutation({
    mutationFn: (siret: string) => siretService.verify(siret),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      refetchCompany();
      toast.success('SIRET vérifié avec succès !');
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'SIRET invalide ou introuvable');
    },
  });

  return (
    <DashboardLayout sidebarItems={proSidebar} title="Espace Professionnel">
      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="space-y-6">
          {/* Welcome */}
          <div>
            <h2 className="text-xl font-bold text-gray-900">Bonjour, {user?.firstname} !</h2>
            <p className="text-gray-500 mt-1">Bienvenue dans votre espace professionnel UpcycleConnect.</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <StatCard
              title="Mes annonces"
              value={dashboard?.my_listings?.length || 0}
              icon={<Tag className="w-5 h-5" />}
              color="blue"
            />
            <StatCard
              title="Projets upcycling"
              value={dashboard?.projects?.length || 0}
              icon={<Briefcase className="w-5 h-5" />}
              color="purple"
            />
            <StatCard
              title="Vues cette semaine"
              value="234"
              icon={<Tag className="w-5 h-5" />}
              color="green"
            />
          </div>

          {/* SIRET Verification */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Vérification SIRET</h2>
              {user?.siret_verified && (
                <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                  <BadgeCheck className="w-4 h-4" />
                  Vérifié
                </span>
              )}
            </div>
            {user?.siret_verified ? (
              <div className="space-y-3">
                {/* Header entreprise */}
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{companyInfo?.company_name || 'Entreprise vérifiée'}</p>
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-100 px-2 py-0.5 rounded-full">
                        <BadgeCheck className="w-3 h-3" /> Vérifié
                      </span>
                    </div>
                    {companyInfo?.category && <p className="text-xs text-gray-500 mt-0.5">{companyInfo.category}</p>}
                  </div>
                </div>

                {/* Détails */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {companyInfo?.address && (
                    <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Adresse</p>
                        <p className="text-sm text-gray-700">{companyInfo.address}</p>
                        {companyInfo.city && (
                          <p className="text-xs text-gray-500">{companyInfo.postal_code} {companyInfo.city}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {companyInfo?.employees && (
                    <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                      <Users className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Effectifs</p>
                        <p className="text-sm text-gray-700">{companyInfo.employees}</p>
                      </div>
                    </div>
                  )}
                  {companyInfo?.date_creation && (
                    <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                      <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Création</p>
                        <p className="text-sm text-gray-700">
                          {format(new Date(companyInfo.date_creation), 'dd MMMM yyyy', { locale: fr })}
                        </p>
                      </div>
                    </div>
                  )}
                  {companyInfo?.turnover && (
                    <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                      <TrendingUp className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                          CA {companyInfo.turnover_year}
                        </p>
                        <p className="text-sm text-gray-700 font-medium">
                          {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(companyInfo.turnover)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Identifiants */}
                <div className="flex items-center gap-4 px-3 py-2 bg-gray-50 rounded-lg text-xs text-gray-500 font-mono">
                  <span>SIRET : {user.siret}</span>
                  {companyInfo?.siren && <span>SIREN : {companyInfo.siren}</span>}
                  {companyInfo?.activity_code && <span>APE : {companyInfo.activity_code}</span>}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg text-sm text-amber-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>Vérifiez votre numéro SIRET pour obtenir le badge professionnel vérifié et accéder à toutes les fonctionnalités.</p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={siretInput}
                    onChange={(e) => setSiretInput(e.target.value.replace(/\D/g, '').slice(0, 14))}
                    placeholder="14 chiffres ex: 12345678901234"
                    className="input flex-1 font-mono"
                    maxLength={14}
                  />
                  <button
                    onClick={() => siretInput.length === 14 && siretMutation.mutate(siretInput)}
                    disabled={siretInput.length !== 14 || siretMutation.isPending}
                    className="btn-primary px-4 flex items-center gap-2 disabled:opacity-50"
                  >
                    {siretMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Vérifier'
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-400">Vérification via la base SIRENE officielle (INSEE)</p>
              </div>
            )}
          </div>

          {/* Subscription card */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Mon abonnement</h2>
              <Link to="/abonnement" className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1">
                Gérer <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {dashboard?.subscription ? (
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{planLabels[dashboard.subscription.plan] || dashboard.subscription.plan}</p>
                  <p className="text-sm text-gray-500">
                    Renouvellement le {dashboard.subscription.renewal_date ? format(new Date(dashboard.subscription.renewal_date), 'dd MMMM yyyy', { locale: fr }) : '-'}
                  </p>
                </div>
                <span className={clsx('ml-auto badge', dashboard.subscription.status === 'active' ? 'badge-green' : 'badge-red')}>
                  {dashboard.subscription.status === 'active' ? 'Actif' : 'Inactif'}
                </span>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400">
                <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Aucun abonnement actif</p>
                <Link to="/abonnement" className="btn-primary text-sm mt-3 inline-block">
                  Choisir un abonnement
                </Link>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* My listings */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Mes annonces</h2>
                <Link to="/annonces/creer" className="text-sm text-primary-500 font-medium hover:text-primary-600 flex items-center gap-1">
                  Créer <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {(dashboard?.my_listings || []).length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Tag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucune annonce</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {(dashboard?.my_listings || []).map((listing: { id: number; title: string; status: string; type: string; price?: number }) => (
                    <li key={listing.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Tag className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{listing.title}</p>
                        <p className="text-xs text-gray-500">{listing.type === 'don' ? 'Don' : `${listing.price}€`}</p>
                      </div>
                      <span className={clsx('badge text-xs', listing.status === 'active' ? 'badge-green' : listing.status === 'pending' ? 'badge-orange' : 'badge-gray')}>
                        {listing.status === 'active' ? 'Active' : listing.status === 'pending' ? 'En attente' : listing.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* My projects */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Mes projets upcycling</h2>
                <Link to="/pro/projets" className="text-sm text-primary-500 font-medium hover:text-primary-600 flex items-center gap-1">
                  Voir tout <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {(dashboard?.projects || []).length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucun projet pour le moment</p>
                  <p className="text-xs mt-1">Partagez vos réalisations d'upcycling</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {(dashboard?.projects || []).map((project: { id: number; title: string; views: number; likes: number; is_featured: boolean }) => (
                    <li key={project.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Briefcase className="w-4 h-4 text-purple-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{project.title}</p>
                        <p className="text-xs text-gray-500">{project.views} vues · {project.likes} j'aime</p>
                      </div>
                      {project.is_featured && <span className="badge-orange text-xs">Mis en avant</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
