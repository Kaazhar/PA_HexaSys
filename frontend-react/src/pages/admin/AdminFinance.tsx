import { DollarSign, FileText } from 'lucide-react';
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

  return (
    <DashboardLayout sidebarItems={adminSidebar} title="Finance">
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
            />
            <StatCard
              title="Revenu annuel"
              value={`${stats?.annual_revenue?.toFixed(0) || 0}€`}
              icon={<DollarSign className="w-5 h-5" />}
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

        {/* Invoices */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Factures récentes</h2>
          </div>
          {invoicesLoading ? (
            <div className="flex justify-center py-10"><LoadingSpinner /></div>
          ) : invoices.length === 0 ? (
            <EmptyState icon={<FileText className="w-10 h-10" />} message="Aucune facture" />
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
