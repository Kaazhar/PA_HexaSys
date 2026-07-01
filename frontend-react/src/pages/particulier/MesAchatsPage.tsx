import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Download, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { particulierSidebar, proSidebar, adminSidebar } from '../../config/sidebars';
import { invoiceService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { Invoice } from '../../types';

const TYPE_STYLES: Record<string, string> = {
  workshop:     'bg-blue-100 text-blue-700',
  subscription: 'bg-purple-100 text-purple-700',
  listing:      'bg-green-100 text-green-700',
  boost:        'bg-orange-100 text-orange-700',
};

function TypeBadge({ type, label }: { type: string; label: string }) {
  const cls = TYPE_STYLES[type] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function InvoiceRow({ inv }: { inv: Invoice }) {
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState(false);

  const typeLabel: Record<string, string> = {
    workshop:     t('purchases.type_workshop'),
    subscription: t('purchases.type_subscription'),
    listing:      t('purchases.type_listing'),
    boost:        t('purchases.type_boost'),
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await invoiceService.downloadPdf(inv.id, inv.number);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="table-cell font-mono text-xs text-gray-500">{inv.number}</td>
      <td className="table-cell">
        <TypeBadge type={inv.type} label={typeLabel[inv.type] ?? inv.type} />
      </td>
      <td className="table-cell text-gray-700 max-w-xs truncate">{inv.description || '-'}</td>
      <td className="table-cell text-right">{inv.amount.toFixed(2)} €</td>
      <td className="table-cell text-right text-gray-500">{inv.tax.toFixed(2)} €</td>
      <td className="table-cell text-right font-semibold text-[#2D5016]">{inv.total.toFixed(2)} €</td>
      <td className="table-cell text-gray-500 text-xs">
        {inv.created_at ? format(new Date(inv.created_at), 'dd MMM yyyy', { locale: fr }) : '-'}
      </td>
      <td className="table-cell">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#2D5016] border border-[#2D5016] rounded-lg hover:bg-[#2D5016] hover:text-white transition-colors disabled:opacity-50"
        >
          {downloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
          {t('purchases.download')}
        </button>
      </td>
    </tr>
  );
}

export default function MesAchatsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const sidebar =
    user?.role === 'admin'         ? adminSidebar :
    user?.role === 'professionnel' ? proSidebar   :
    particulierSidebar;

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', 'mine'],
    queryFn: () => invoiceService.getMine(),
  });

  const invoices: Invoice[] = data?.data ?? [];

  const total = invoices.reduce((sum, inv) => sum + inv.total, 0);

  return (
    <DashboardLayout sidebarItems={sidebar} title={t('purchases.title')}>
      <div className="space-y-6">

        {invoices.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(['workshop', 'subscription', 'listing', 'boost'] as const).map((type) => {
              const typeLabel: Record<string, string> = {
                workshop:     t('purchases.type_workshop'),
                subscription: t('purchases.type_subscription'),
                listing:      t('purchases.type_listing'),
                boost:        t('purchases.type_boost'),
              };
              const count = invoices.filter(i => i.type === type).length;
              const sum   = invoices.filter(i => i.type === type).reduce((s, i) => s + i.total, 0);
              if (count === 0) return null;
              return (
                <div key={type} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <TypeBadge type={type} label={typeLabel[type]} />
                  <p className="mt-2 text-2xl font-bold text-gray-900">{count}</p>
                  <p className="text-xs text-gray-500">{sum.toFixed(2)} € TTC</p>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">{t('purchases.history')}</h2>
            {invoices.length > 0 && (
              <span className="text-sm text-gray-500">
                {t('purchases.total_spent')} <span className="font-semibold text-[#2D5016]">{total.toFixed(2)} €</span>
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10"><LoadingSpinner /></div>
          ) : invoices.length === 0 ? (
            <EmptyState message={t('purchases.empty')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="table-header">{t('purchases.col_number')}</th>
                    <th className="table-header">{t('purchases.col_type')}</th>
                    <th className="table-header">{t('purchases.col_desc')}</th>
                    <th className="table-header text-right">{t('purchases.col_ht')}</th>
                    <th className="table-header text-right">{t('purchases.col_tva')}</th>
                    <th className="table-header text-right">{t('purchases.col_ttc')}</th>
                    <th className="table-header">{t('purchases.col_date')}</th>
                    <th className="table-header"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {invoices.map(inv => <InvoiceRow key={inv.id} inv={inv} />)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
