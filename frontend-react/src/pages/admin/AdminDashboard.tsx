import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/common/StatCard';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Link } from 'react-router-dom';
import { adminSidebar } from '../../config/sidebars';
import { useTranslation } from 'react-i18next';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminService.getStats(),
    refetchInterval: 30000,
  });

  const stats = data?.data;

  return (
    <DashboardLayout sidebarItems={adminSidebar} title={t('admin_dashboard.title')}>
      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard title={t('admin_dashboard.kpi_users')} value={stats?.total_users || 0} color="green" />
            <StatCard title={t('admin_dashboard.kpi_listings')} value={stats?.active_listings || 0} color="blue" />
            <StatCard title={t('admin_dashboard.kpi_workshops')} value={stats?.total_workshops || 0} color="purple" />
            <StatCard title={t('admin_dashboard.kpi_revenue')} value={`${stats?.monthly_revenue_total?.toFixed(0) || 0}€`} color="coral" />
          </div>

          
          {((stats?.pending_listings || 0) > 0 || (stats?.pending_workshops || 0) > 0 || (stats?.pending_container_requests || 0) > 0) && (
            <div className="card border-l-4 border-amber-400">
              <h2 className="font-semibold text-gray-900 mb-3">{t('admin_dashboard.actions_required')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(stats?.pending_listings || 0) > 0 && (
                  <Link to="/admin/annonces?status=pending" className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{stats?.pending_listings} {t('admin_dashboard.listings_pending')}</p>
                      <p className="text-xs text-gray-500">{t('admin_dashboard.validation_required')}</p>
                    </div>
                  </Link>
                )}
                {(stats?.pending_workshops || 0) > 0 && (
                  <Link to="/admin/formations?status=pending" className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{stats?.pending_workshops} {t('admin_dashboard.workshops_pending')}</p>
                      <p className="text-xs text-gray-500">{t('admin_dashboard.validation_required')}</p>
                    </div>
                  </Link>
                )}
                {(stats?.pending_container_requests || 0) > 0 && (
                  <Link to="/admin/conteneurs" className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{stats?.pending_container_requests} {t('admin_dashboard.container_requests_pending')}</p>
                      <p className="text-xs text-gray-500">{t('admin_dashboard.pending_treatment')}</p>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          )}

          
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">{t('admin_dashboard.activity_summary')}</h2>
            <div className="divide-y divide-gray-100">
              <div className="flex justify-between py-3 text-sm"><span className="text-gray-500">{t('admin_dashboard.listings_pending')}</span><span className="font-semibold text-amber-600">{stats?.pending_listings || 0}</span></div>
              <div className="flex justify-between py-3 text-sm"><span className="text-gray-500">{t('admin_dashboard.workshops_pending')}</span><span className="font-semibold text-amber-600">{stats?.pending_workshops || 0}</span></div>
              <div className="flex justify-between py-3 text-sm"><span className="text-gray-500">{t('admin_dashboard.container_requests_pending')}</span><span className="font-semibold text-amber-600">{stats?.pending_container_requests || 0}</span></div>
              <div className="flex justify-between py-3 text-sm"><span className="text-gray-500">{t('admin_dashboard.monthly_revenue')}</span><span className="font-bold text-primary-600">{stats?.monthly_revenue_total?.toFixed(0) || 0}€</span></div>
            </div>
          </div>

          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: t('admin_dashboard.manage_users'), path: '/admin/utilisateurs' },
              { label: t('admin_dashboard.validate_listings'), path: '/admin/annonces' },
              { label: t('admin_dashboard.manage_categories'), path: '/admin/categories' },
              { label: t('admin_dashboard.see_finance'), path: '/admin/finance' },
            ].map((item, i) => (
              <Link key={i} to={item.path} className="card hover:shadow-md transition-shadow flex flex-col items-center gap-3 py-5 text-center">
                <span className="text-sm font-medium text-gray-700">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
