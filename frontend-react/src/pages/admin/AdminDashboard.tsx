import { LayoutDashboard, Users, Tag, BookOpen, Package, DollarSign, Settings, AlertCircle, TrendingUp } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/common/StatCard';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Link } from 'react-router-dom';

const sidebarItems = [
  { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Utilisateurs', path: '/admin/utilisateurs', icon: <Users className="w-4 h-4" /> },
  { label: 'Annonces', path: '/admin/annonces', icon: <Tag className="w-4 h-4" /> },
  { label: 'Formations', path: '/admin/formations', icon: <BookOpen className="w-4 h-4" /> },
  { label: 'Conteneurs', path: '/admin/conteneurs', icon: <Package className="w-4 h-4" /> },
  { label: 'Finance', path: '/admin/finance', icon: <DollarSign className="w-4 h-4" /> },
  { label: 'Configuration', path: '/admin/config', icon: <Settings className="w-4 h-4" /> },
];

const PIE_COLORS = ['#2D5016', '#C97664', '#3B82F6', '#8B5CF6'];

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminService.getStats(),
    refetchInterval: 30000,
  });

  const stats = data?.data;

  return (
    <DashboardLayout sidebarItems={sidebarItems} title="Tableau de bord Admin">
      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title="Utilisateurs totaux"
              value={stats?.total_users || 0}
              icon={<Users className="w-5 h-5" />}
              color="green"
              trend={{ value: 12, positive: true }}
            />
            <StatCard
              title="Annonces actives"
              value={stats?.active_listings || 0}
              icon={<Tag className="w-5 h-5" />}
              color="blue"
              trend={{ value: 8, positive: true }}
            />
            <StatCard
              title="Formations à venir"
              value={stats?.total_workshops || 0}
              icon={<BookOpen className="w-5 h-5" />}
              color="purple"
            />
            <StatCard
              title="Revenu mensuel"
              value={`${stats?.monthly_revenue_total?.toFixed(0) || 0}€`}
              icon={<DollarSign className="w-5 h-5" />}
              color="coral"
              trend={{ value: 5, positive: true }}
            />
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

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue chart */}
            <div className="card lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-primary-500" />
                <h2 className="font-semibold text-gray-900">Évolution des revenus</h2>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={stats?.monthly_revenue || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => [`${v}€`, 'Revenus']} />
                  <Line type="monotone" dataKey="revenue" stroke="#2D5016" strokeWidth={2.5} dot={{ fill: '#2D5016', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Distribution chart */}
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-6">Répartition des revenus</h2>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Abonnements Pro', value: 2850 },
                      { name: 'Ateliers', value: 620 },
                      { name: 'Enterprise', value: 380 },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {PIE_COLORS.map((color, index) => (
                      <Cell key={index} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v}€`]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Gérer les utilisateurs', path: '/admin/utilisateurs', icon: <Users className="w-5 h-5" />, color: 'text-blue-500 bg-blue-50' },
              { label: 'Valider les annonces', path: '/admin/annonces', icon: <Tag className="w-5 h-5" />, color: 'text-amber-500 bg-amber-50' },
              { label: 'Gérer les conteneurs', path: '/admin/conteneurs', icon: <Package className="w-5 h-5" />, color: 'text-primary-500 bg-primary-50' },
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
