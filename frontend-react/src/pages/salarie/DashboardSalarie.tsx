import { LayoutDashboard, BookOpen, FileText, Calendar, MapPin, Users, Clock, ArrowRight } from 'lucide-react';
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
  { label: 'Dashboard', path: '/salarie', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Formations', path: '/annonces', icon: <BookOpen className="w-4 h-4" /> },
];

const statusConfig: Record<string, string> = {
  draft: 'badge-gray',
  pending: 'badge-orange',
  active: 'badge-green',
  cancelled: 'badge-red',
};

const statusLabels: Record<string, string> = {
  draft: 'Brouillon',
  pending: 'En attente',
  active: 'Actif',
  cancelled: 'Annulé',
};

export default function DashboardSalarie() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'salarie'],
    queryFn: () => dashboardService.getSalarie(),
  });

  const dashboard = data?.data;

  return (
    <DashboardLayout sidebarItems={sidebarItems} title="Espace Salarié">
      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="space-y-6">
          {/* Welcome */}
          <div>
            <h2 className="text-xl font-bold text-gray-900">Bonjour, {user?.firstname} !</h2>
            <p className="text-gray-500 mt-1">Gérez vos formations et articles depuis votre espace salarié.</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <StatCard
              title="Mes formations"
              value={dashboard?.my_workshops?.length || 0}
              icon={<BookOpen className="w-5 h-5" />}
              color="blue"
            />
            <StatCard
              title="Mes articles"
              value={dashboard?.my_articles?.length || 0}
              icon={<FileText className="w-5 h-5" />}
              color="purple"
            />
            <StatCard
              title="Formations à venir"
              value={dashboard?.upcoming_workshops?.length || 0}
              icon={<Calendar className="w-5 h-5" />}
              color="green"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* My workshops */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Mes formations</h2>
                <Link to="/salarie/formations" className="text-sm text-primary-500 font-medium hover:text-primary-600 flex items-center gap-1">
                  Voir tout <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {(dashboard?.my_workshops || []).length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucune formation programmée</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {(dashboard?.my_workshops || []).map((ws: { id: number; title: string; date: string; enrolled: number; max_spots: number; status: string; location: string }) => (
                    <li key={ws.id} className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{ws.title}</p>
                          <div className="flex flex-wrap gap-3 mt-1.5">
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              {ws.date ? format(new Date(ws.date), 'dd MMM yyyy', { locale: fr }) : '-'}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <MapPin className="w-3 h-3" />
                              {ws.location}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Users className="w-3 h-3" />
                              {ws.enrolled}/{ws.max_spots}
                            </span>
                          </div>
                        </div>
                        <span className={clsx('badge text-xs flex-shrink-0', statusConfig[ws.status] || 'badge-gray')}>
                          {statusLabels[ws.status] || ws.status}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Upcoming workshops */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Prochaines formations (plateforme)</h2>
              </div>
              {(dashboard?.upcoming_workshops || []).length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucune formation à venir</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {(dashboard?.upcoming_workshops || []).map((ws: { id: number; title: string; date: string; duration: number; location: string; price: number }) => (
                    <li key={ws.id} className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{ws.title}</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              {ws.date ? format(new Date(ws.date), 'dd MMM', { locale: fr }) : '-'}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              {ws.duration} min
                            </span>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-primary-500 flex-shrink-0">
                          {ws.price === 0 ? 'Gratuit' : `${ws.price}€`}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* My articles */}
          {(dashboard?.my_articles || []).length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Mes articles récents</h2>
                <Link to="/salarie/articles" className="text-sm text-primary-500 font-medium hover:text-primary-600 flex items-center gap-1">
                  Voir tout <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(dashboard?.my_articles || []).map((article: { id: number; title: string; status: string; views: number; created_at: string }) => (
                  <div key={article.id} className="p-4 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{article.title}</p>
                      <span className={clsx('badge text-xs flex-shrink-0', article.status === 'published' ? 'badge-green' : 'badge-gray')}>
                        {article.status === 'published' ? 'Publié' : 'Brouillon'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{article.views} vues</span>
                      <span>·</span>
                      <span>{article.created_at ? format(new Date(article.created_at), 'dd MMM yyyy', { locale: fr }) : '-'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Créer une formation', path: '/salarie/formations', icon: <BookOpen className="w-5 h-5" />, color: 'text-blue-500 bg-blue-50' },
              { label: 'Écrire un article', path: '/salarie/articles', icon: <FileText className="w-5 h-5" />, color: 'text-purple-500 bg-purple-50' },
              { label: 'Mon planning', path: '/salarie/planning', icon: <Calendar className="w-5 h-5" />, color: 'text-amber-500 bg-amber-50' },
            ].map((action, i) => (
              <Link key={i} to={action.path} className="card hover:shadow-md transition-shadow flex items-center gap-4">
                <div className={`p-3 rounded-xl ${action.color}`}>{action.icon}</div>
                <span className="text-sm font-medium text-gray-700">{action.label}</span>
                <ArrowRight className="w-4 h-4 text-gray-400 ml-auto" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
