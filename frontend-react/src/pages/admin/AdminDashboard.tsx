import { Users, Tag, BookOpen, Package, DollarSign, FolderOpen, AlertCircle } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/common/StatCard';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Link } from 'react-router-dom';
import { adminSidebar } from '../../config/sidebars';

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminService.getStats(),
    refetchInterval: 30000,
  });

  const stats = data?.data;

  return (
    <DashboardLayout sidebarItems={adminSidebar} title="Tableau de bord Admin">
      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard title="Utilisateurs totaux" value={stats?.total_users || 0} icon={<Users className="w-5 h-5" />} color="green" />
            <StatCard title="Annonces actives" value={stats?.active_listings || 0} icon={<Tag className="w-5 h-5" />} color="blue" />
            <StatCard title="Formations" value={stats?.total_workshops || 0} icon={<BookOpen className="w-5 h-5" />} color="purple" />
            <StatCard title="Revenu mensuel" value={`${stats?.monthly_revenue_total?.toFixed(0) || 0}€`} icon={<DollarSign className="w-5 h-5" />} color="coral" />
          </div>

          {/* Alerts */}
          {((stats?.pending_listings || 0) > 0 || (stats?.pending_workshops || 0) > 0 || (stats?.pending_container_requests || 0) > 0) && (
            <div className="card border-l-4 border-amber-400">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <h2 className="font-semibold text-gray-900">Actions requises</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(stats?.pending_listings || 0) > 0 && (
                  <Link to="/admin/annonces?status=pending" className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
                    <Tag className="w-5 h-5 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{stats?.pending_listings} annonce{(stats?.pending_listings || 0) > 1 ? 's' : ''} en attente</p>
                      <p className="text-xs text-gray-500">Validation requise</p>
                    </div>
                  </Link>
                )}
                {(stats?.pending_workshops || 0) > 0 && (
                  <Link to="/admin/formations?status=pending" className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
                    <BookOpen className="w-5 h-5 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{stats?.pending_workshops} formation{(stats?.pending_workshops || 0) > 1 ? 's' : ''} en attente</p>
                      <p className="text-xs text-gray-500">Validation requise</p>
                    </div>
                  </Link>
                )}
                {(stats?.pending_container_requests || 0) > 0 && (
                  <Link to="/admin/conteneurs" className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
                    <Package className="w-5 h-5 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{stats?.pending_container_requests} demande{(stats?.pending_container_requests || 0) > 1 ? 's' : ''} de dépôt</p>
                      <p className="text-xs text-gray-500">En attente de traitement</p>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Résumé de l'activité</h2>
            <div className="divide-y divide-gray-100">
              <div className="flex justify-between py-3 text-sm"><span className="text-gray-500">Annonces en attente</span><span className="font-semibold text-amber-600">{stats?.pending_listings || 0}</span></div>
              <div className="flex justify-between py-3 text-sm"><span className="text-gray-500">Formations en attente</span><span className="font-semibold text-amber-600">{stats?.pending_workshops || 0}</span></div>
              <div className="flex justify-between py-3 text-sm"><span className="text-gray-500">Demandes conteneur en attente</span><span className="font-semibold text-amber-600">{stats?.pending_container_requests || 0}</span></div>
              <div className="flex justify-between py-3 text-sm"><span className="text-gray-500">Revenu mensuel total</span><span className="font-bold text-primary-600">{stats?.monthly_revenue_total?.toFixed(0) || 0}€</span></div>
            </div>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Gérer les utilisateurs', path: '/admin/utilisateurs', icon: <Users className="w-5 h-5" />, color: 'text-blue-500 bg-blue-50' },
              { label: 'Valider les annonces', path: '/admin/annonces', icon: <Tag className="w-5 h-5" />, color: 'text-amber-500 bg-amber-50' },
              { label: 'Gérer les catégories', path: '/admin/categories', icon: <FolderOpen className="w-5 h-5" />, color: 'text-purple-500 bg-purple-50' },
              { label: 'Voir la finance', path: '/admin/finance', icon: <DollarSign className="w-5 h-5" />, color: 'text-coral-500 bg-coral-400/10' },
            ].map((item, i) => (
              <Link key={i} to={item.path} className="card hover:shadow-md transition-shadow flex flex-col items-center gap-3 py-5 text-center">
                <div className={`p-3 rounded-xl ${item.color}`}>{item.icon}</div>
                <span className="text-sm font-medium text-gray-700">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
