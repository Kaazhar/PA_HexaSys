import { LayoutDashboard, Users, Tag, BookOpen, Package, DollarSign, Settings, TrendingUp, FileText } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/common/StatCard';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import clsx from 'clsx';

const sidebarItems = [
  { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Utilisateurs', path: '/admin/utilisateurs', icon: <Users className="w-4 h-4" /> },
  { label: 'Annonces', path: '/admin/annonces', icon: <Tag className="w-4 h-4" /> },
  { label: 'Formations', path: '/admin/formations', icon: <BookOpen className="w-4 h-4" /> },
  { label: 'Conteneurs', path: '/admin/conteneurs', icon: <Package className="w-4 h-4" /> },
  { label: 'Finance', path: '/admin/finance', icon: <DollarSign className="w-4 h-4" /> },
  { label: 'Configuration', path: '/admin/config', icon: <Settings className="w-4 h-4" /> },
];

export default function AdminFinance() {
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'finance'],
    queryFn: () => adminService.getFinance(),
  });

  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ['admin', 'invoices'],
    queryFn: () => adminService.getInvoices(),
  });

  const stats = statsData?.data;
  const invoices = invoicesData?.data || [];

  const revenueByPlan = stats?.revenue_by_plan || [];

  const statusConfig: Record<string, string> = {
    paid: 'badge-green',
    pending: 'badge-orange',
    overdue: 'badge-red',
  };

  const statusLabel: Record<string, string> = {
    paid: 'Payée',
    pending: 'En attente',
    overdue: 'En retard',
  };

  return (
    <DashboardLayout sidebarItems={sidebarItems} title="Finance">
      <div className="space-y-6">
        {/* Stats */}
        {statsLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title="Revenu mensuel"
              value={`${stats?.monthly_revenue?.toFixed(0) || 0}€`}
              icon={<DollarSign className="w-5 h-5" />}
              color="green"
              trend={{ value: 5, positive: true }}
            />
            <StatCard
              title="Revenu annuel"
              value={`${stats?.annual_revenue?.toFixed(0) || 0}€`}
              icon={<TrendingUp className="w-5 h-5" />}
              color="blue"
            />
            <StatCard
              title="Factures totales"
              value={stats?.total_invoices || 0}
              icon={<FileText className="w-5 h-5" />}
              color="purple"
            />
            <StatCard
              title="Montant en attente"
              value={`${stats?.pending_amount?.toFixed(0) || 0}€`}
              icon={<DollarSign className="w-5 h-5" />}
              color="coral"
            />
          </div>
        )}

        {/* Revenue by plan chart */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-5">Revenus par abonnement</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueByPlan}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="plan" tick={{ fontSize: 13 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [`${v}€`, 'Revenus']} />
              <Bar dataKey="amount" fill="#2D5016" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Invoices */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Factures récentes</h2>
          </div>
          {invoicesLoading ? (
            <div className="flex justify-center py-10"><LoadingSpinner /></div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Aucune facture</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="table-header">Numéro</th>
                    <th className="table-header">Client</th>
                    <th className="table-header">Type</th>
                    <th className="table-header">Montant HT</th>
                    <th className="table-header">TVA</th>
                    <th className="table-header">Total TTC</th>
                    <th className="table-header">Statut</th>
                    <th className="table-header">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="table-cell font-mono text-xs text-gray-600">{inv.number}</td>
                      <td className="table-cell">{inv.user ? `${inv.user.firstname} ${inv.user.lastname}` : '-'}</td>
                      <td className="table-cell text-gray-500">{inv.type}</td>
                      <td className="table-cell font-medium">{inv.amount.toFixed(2)}€</td>
                      <td className="table-cell text-gray-500">{inv.tax.toFixed(2)}€</td>
                      <td className="table-cell font-bold text-primary-500">{inv.total.toFixed(2)}€</td>
                      <td className="table-cell">
                        <span className={clsx('badge', statusConfig[inv.status] || 'badge-gray')}>
                          {statusLabel[inv.status] || inv.status}
                        </span>
                      </td>
                      <td className="table-cell text-gray-500 text-xs">
                        {inv.created_at ? format(new Date(inv.created_at), 'dd MMM yyyy', { locale: fr }) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
