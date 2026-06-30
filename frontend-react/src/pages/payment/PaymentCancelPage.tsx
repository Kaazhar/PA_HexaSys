import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function PaymentCancelPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('payment_cancel.title')}</h1>
        <p className="text-gray-500 mb-6">{t('payment_cancel.desc')}</p>

        <div className="space-y-3">
          <button
            onClick={() => navigate(-1)}
            className="w-full py-3 px-4 bg-[#2D5016] text-white rounded-xl font-medium hover:bg-[#3a6a1e] transition-colors"
          >
            {t('payment_cancel.back')}
          </button>
          <Link
            to="/formations"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm"
          >
            {t('payment_cancel.see_workshops')}
          </Link>
        </div>
      </div>
    </div>
  );
}
