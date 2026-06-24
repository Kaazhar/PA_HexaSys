import { Tag, BookOpen, Star, CheckCircle, Clock, ArrowRight, PlusCircle } from 'lucide-react';
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
import { particulierSidebar } from '../../config/sidebars';
import { useTranslation } from 'react-i18next';

const statusConfig = {
  pending: { labelKey: 'listings.status.pending', class: 'badge-orange', icon: <Clock className="w-3 h-3" /> },
  active: { labelKey: 'listings.status.active', class: 'badge-green', icon: <CheckCircle className="w-3 h-3" /> },
  rejected: { labelKey: 'listings.status.rejected', class: 'badge-red', icon: null },
  sold: { labelKey: 'listings.status.sold', class: 'badge-gray', icon: null },
};

export default function DashboardParticulier() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'particulier'],
    queryFn: () => dashboardService.getParticulier(),
  });

  const dashboard = data?.data;

  return (
    <DashboardLayout sidebarItems={particulierSidebar} title={t('dashboard_particulier.title')}>
      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="space-y-6">
          
          <div>
            <h2 className="text-xl font-bold text-gray-900">{t('dashboard_particulier.welcome', { name: user?.firstname })}</h2>
            <p className="text-gray-500 mt-1">{t('dashboard_particulier.welcome_sub')}</p>
            {user?.first_login && (
              <p className="text-sm text-primary-600 mt-2">{t('dashboard_particulier.first_login')}</p>
            )}
          </div>

          
          <div id="tour-stats" className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <StatCard
              title={t('dashboard_particulier.active_listings')}
              value={dashboard?.active_listings || 0}
              icon={<Tag className="w-5 h-5" />}
              color="green"
            />
            <StatCard
              title={t('dashboard_particulier.workshops_attended')}
              value={dashboard?.bookings?.length || 0}
              icon={<BookOpen className="w-5 h-5" />}
              color="blue"
            />
            <StatCard
              title={t('dashboard_particulier.upcycling_score')}
              value={`${dashboard?.score?.total_points || 0} pts`}
              icon={<Star className="w-5 h-5" />}
              color="coral"
              subtitle={dashboard?.score?.level}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">{t('dashboard_particulier.my_listings')}</h2>
                <Link to="/annonces/creer" className="text-sm text-primary-500 font-medium hover:text-primary-600 flex items-center gap-1">
                  {t('dashboard_particulier.create')} <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {(dashboard?.my_listings || []).length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Tag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{t('dashboard_particulier.no_listings')}</p>
                  <Link to="/annonces/creer" className="btn-primary text-sm mt-3 inline-block">
                    {t('dashboard_particulier.create_listing')}
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
                        <p className="text-xs text-gray-500">{listing.type === 'don' ? t('dashboard_particulier.don') : `${t('dashboard_particulier.sale')} - ${listing.price}€`}</p>
                      </div>
                      <span className={clsx('badge', statusConfig[listing.status as keyof typeof statusConfig]?.class || 'badge-gray')}>
                        {t(statusConfig[listing.status as keyof typeof statusConfig]?.labelKey || listing.status)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">{t('dashboard_particulier.upcoming_workshops')}</h2>
                <Link to="/formations" className="text-sm text-primary-500 font-medium hover:text-primary-600 flex items-center gap-1">
                  {t('dashboard_particulier.see_all')} <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {(dashboard?.upcoming_workshops || []).length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{t('dashboard_particulier.no_workshops')}</p>
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
                        {ws.price === 0 ? t('common.free') : `${ws.price}€`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {dashboard?.monthly_listings && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">{t('dashboard_particulier.activity_title')}</h2>
              <div className="flex items-end gap-2 h-24">
                {dashboard.monthly_listings.map((m: { month: string; count: number }, i: number) => {
                  const max = Math.max(...dashboard.monthly_listings.map((x: { count: number }) => x.count), 1);
                  const pct = Math.round((m.count / max) * 100);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-gray-500 font-medium">{m.count > 0 ? m.count : ''}</span>
                      <div className="w-full bg-gray-100 rounded-t-md relative" style={{ height: '72px' }}>
                        <div
                          className="absolute bottom-0 left-0 right-0 bg-primary-500 rounded-t-md transition-all"
                          style={{ height: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">{m.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}


          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { labelKey: 'dashboard_particulier.create_listing', path: '/annonces/creer', icon: <PlusCircle className="w-5 h-5" />, color: 'text-primary-500 bg-primary-50' },
              { labelKey: 'dashboard_particulier.my_score', path: '/score', icon: <Star className="w-5 h-5" />, color: 'text-amber-500 bg-amber-50' },
              { labelKey: 'dashboard_particulier.training', path: '/formations', icon: <BookOpen className="w-5 h-5" />, color: 'text-purple-500 bg-purple-50' },
            ].map((action, i) => (
              <Link key={i} to={action.path} className="card hover:shadow-md transition-shadow flex flex-col items-center gap-3 py-5 text-center">
                <div className={`p-3 rounded-xl ${action.color}`}>{action.icon}</div>
                <span className="text-sm font-medium text-gray-700">{t(action.labelKey)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
