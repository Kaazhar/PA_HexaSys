import { LayoutDashboard, Tag, PlusCircle, Package, Star, Calendar, BookOpen, CheckCircle, Clock, ArrowRight, Leaf } from 'lucide-react';
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
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Mes annonces', path: '/annonces/mes-annonces', icon: <Tag className="w-4 h-4" /> },
  { label: 'Créer une annonce', path: '/annonces/creer', icon: <PlusCircle className="w-4 h-4" /> },
  { label: 'Demande conteneur', path: '/conteneurs/demande', icon: <Package className="w-4 h-4" /> },
  { label: 'Mon score', path: '/score', icon: <Star className="w-4 h-4" /> },
  { label: 'Planning', path: '/planning', icon: <Calendar className="w-4 h-4" /> },
  { label: 'Formations', path: '/annonces', icon: <BookOpen className="w-4 h-4" /> },
];

const statusConfig = {
  pending: { label: 'En attente', class: 'badge-orange', icon: <Clock className="w-3 h-3" /> },
  active: { label: 'Active', class: 'badge-green', icon: <CheckCircle className="w-3 h-3" /> },
  rejected: { label: 'Rejetée', class: 'badge-red', icon: null },
  sold: { label: 'Vendue', class: 'badge-gray', icon: null },
};

export default function DashboardParticulier() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'particulier'],
    queryFn: () => dashboardService.getParticulier(),
  });

  const dashboard = data?.data;

  return (
    <DashboardLayout sidebarItems={sidebarItems} title="Mon espace">
      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="space-y-6">
          {/* Welcome */}
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Bonjour, {user?.firstname} ! 👋</h2>
                <p className="text-white/70 mt-1">Continuez à contribuer à l'économie circulaire.</p>
              </div>
              <div className="hidden sm:flex items-center gap-3">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Leaf className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>
            {user?.first_login && (
              <div className="mt-4 p-3 bg-white/10 rounded-xl">
                <p className="text-sm font-medium">🎉 Bienvenue ! Commencez par créer votre première annonce.</p>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <StatCard
              title="Annonces actives"
              value={dashboard?.active_listings || 0}
              icon={<Tag className="w-5 h-5" />}
              color="green"
            />
            <StatCard
              title="Ateliers suivis"
              value={dashboard?.bookings?.length || 0}
              icon={<BookOpen className="w-5 h-5" />}
              color="blue"
            />
            <StatCard
              title="Score upcycling"
              value={`${dashboard?.score?.total_points || 0} pts`}
              icon={<Star className="w-5 h-5" />}
              color="coral"
              subtitle={dashboard?.score?.level}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* My listings */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Mes dernières annonces</h2>
                <Link to="/annonces/creer" className="text-sm text-primary-500 font-medium hover:text-primary-600 flex items-center gap-1">
                  Créer <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {(dashboard?.my_listings || []).length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Tag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucune annonce pour le moment</p>
                  <Link to="/annonces/creer" className="btn-primary text-sm mt-3 inline-block">
                    Créer une annonce
                  </Link>
                </div>
              ) : (
                <ul className="space-y-3">
                  {(dashboard?.my_listings || []).map((listing: { id: number; title: string; status: string; type: string; price?: number }) => (
                    <li key={listing.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Tag className="w-4 h-4 text-primary-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{listing.title}</p>
                        <p className="text-xs text-gray-500">{listing.type === 'don' ? 'Don' : `Vente - ${listing.price}€`}</p>
                      </div>
                      <span className={clsx('badge', statusConfig[listing.status as keyof typeof statusConfig]?.class || 'badge-gray')}>
                        {statusConfig[listing.status as keyof typeof statusConfig]?.label || listing.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Upcoming workshops */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Prochaines formations</h2>
                <Link to="/annonces" className="text-sm text-primary-500 font-medium hover:text-primary-600 flex items-center gap-1">
                  Voir tout <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {(dashboard?.upcoming_workshops || []).length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucune formation à venir</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {(dashboard?.upcoming_workshops || []).map((ws: { id: number; title: string; date: string; location: string; price: number }) => (
                    <li key={ws.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{ws.title}</p>
                        <p className="text-xs text-gray-500">
                          {ws.date ? format(new Date(ws.date), 'dd MMM', { locale: fr }) : ''} — {ws.location}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-primary-500">
                        {ws.price === 0 ? 'Gratuit' : `${ws.price}€`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Créer une annonce', path: '/annonces/creer', icon: <PlusCircle className="w-5 h-5" />, color: 'text-primary-500 bg-primary-50' },
              { label: 'Demande de dépôt', path: '/conteneurs/demande', icon: <Package className="w-5 h-5" />, color: 'text-blue-500 bg-blue-50' },
              { label: 'Mon score', path: '/score', icon: <Star className="w-5 h-5" />, color: 'text-amber-500 bg-amber-50' },
              { label: 'Formations', path: '/annonces', icon: <BookOpen className="w-5 h-5" />, color: 'text-purple-500 bg-purple-50' },
            ].map((action, i) => (
              <Link key={i} to={action.path} className="card hover:shadow-md transition-shadow flex flex-col items-center gap-3 py-5 text-center">
                <div className={`p-3 rounded-xl ${action.color}`}>{action.icon}</div>
                <span className="text-sm font-medium text-gray-700">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
