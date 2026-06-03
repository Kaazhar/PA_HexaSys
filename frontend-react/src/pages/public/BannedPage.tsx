import { ShieldX } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

export default function BannedPage() {
  const { logout, user } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldX className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">{t('banned_page.title')}</h1>
        <p className="text-gray-500 text-sm mb-6">
          {t('banned_page.desc')}
          {user?.ban_reason && (
            <span className="block mt-2 text-gray-700 font-medium">
              {t('banned_page.reason')} {user.ban_reason}
            </span>
          )}
        </p>
        <p className="text-xs text-gray-400 mb-6">
          {t('banned_page.contact')}{' '}
          <a href="mailto:upcycleconnectnewletter@gmail.com" className="text-primary-500 hover:underline">
            upcycleconnectnewletter@gmail.com
          </a>
        </p>
        <button onClick={logout} className="btn-secondary w-full">
          {t('banned_page.logout')}
        </button>
      </div>
    </div>
  );
}
