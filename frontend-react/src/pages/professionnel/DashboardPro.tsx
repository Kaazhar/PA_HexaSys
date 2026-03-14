import { LayoutDashboard, Tag, Briefcase, CreditCard, ArrowRight } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/common/StatCard';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import clsx from 'clsx';

const sidebarItems = [
  { label: 'Dashboard', path: '/pro', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Annonces', path: '/annonces', icon: <Tag className="w-4 h-4" /> },
  { label: 'Créer une annonce', path: '/annonces/creer', icon: <Briefcase className="w-4 h-4" /> },
];

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

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'pro'],
    queryFn: () => dashboardService.getPro(),
  });

  const dashboard = data?.data;

  return (
    <DashboardLayout sidebarItems={sidebarItems} title="Espace Professionnel">
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

          {/* Subscription card */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Mon abonnement</h2>
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
