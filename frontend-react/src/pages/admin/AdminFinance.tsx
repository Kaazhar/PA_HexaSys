import { DollarSign, FileText, Percent } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/common/StatCard';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { adminSidebar } from '../../config/sidebars';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import { invoiceStatuses } from '../../config/statuses';
import { useTranslation } from 'react-i18next';

export default function AdminFinance() {
  const { t } = useTranslation();
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

  return (
    <DashboardLayout sidebarItems={adminSidebar} title={t('admin_finance.title')}>
      <div className="space-y-6">
        {/* Stats */}
        {statsLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title={t('admin_finance.monthly_revenue')}
              value={`${stats?.monthly_revenue?.toFixed(0) || 0}€`}
              icon={<DollarSign className="w-5 h-5" />}
              color="green"
            />
            <StatCard
              title={t('admin_finance.annual_revenue')}
              value={`${stats?.annual_revenue?.toFixed(0) || 0}€`}
              icon={<DollarSign className="w-5 h-5" />}
              color="blue"
            />
            <StatCard
              title={t('admin_finance.total_invoices')}
              value={stats?.total_invoices || 0}
              icon={<FileText className="w-5 h-5" />}
              color="purple"
            />
            <StatCard
              title={t('admin_finance.pending_amount')}
              value={`${stats?.pending_amount?.toFixed(0) || 0}€`}
              icon={<DollarSign className="w-5 h-5" />}
              color="coral"
            />
            <StatCard
              title={t('admin_finance.monthly_commissions')}
              value={`${stats?.monthly_commissions?.toFixed(2) || '0.00'}€`}
              icon={<Percent className="w-5 h-5" />}
              color="green"
            />
            <StatCard
              title={t('admin_finance.total_commissions')}
              value={`${stats?.total_commissions?.toFixed(2) || '0.00'}€`}
              icon={<Percent className="w-5 h-5" />}
              color="blue"
            />
            <StatCard
              title={t('admin_finance.sold_listings')}
              value={stats?.total_sold_listings || 0}
              icon={<FileText className="w-5 h-5" />}
              color="purple"
            />
          </div>
        )}

        {/* Invoices */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">{t('admin_finance.recent_invoices')}</h2>
          </div>
          {invoicesLoading ? (
            <div className="flex justify-center py-10"><LoadingSpinner /></div>
          ) : invoices.length === 0 ? (
            <EmptyState icon={<FileText className="w-10 h-10" />} message={t('common.noData')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="table-header">{t('admin_finance.col_number')}</th>
                    <th className="table-header">{t('admin_finance.col_client')}</th>
                    <th className="table-header">{t('admin_finance.col_type')}</th>
                    <th className="table-header">{t('admin_finance.col_ht')}</th>
                    <th className="table-header">{t('admin_finance.col_tva')}</th>
                    <th className="table-header">{t('admin_finance.col_ttc')}</th>
                    <th className="table-header">{t('admin_finance.col_status')}</th>
                    <th className="table-header">{t('admin_finance.col_date')}</th>
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
                        <StatusBadge status={inv.status} config={invoiceStatuses} />
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
