import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-beige-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-black text-primary-500 mb-2">404</div>
        <div className="text-6xl mb-6">🌿</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('not_found_page.title')}</h1>
        <p className="text-gray-500 mb-8">{t('not_found_page.desc')}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => window.history.back()} className="btn-secondary flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            {t('not_found_page.back')}
          </button>
          <Link to="/" className="btn-primary flex items-center justify-center gap-2">
            <Home className="w-4 h-4" />
            {t('not_found_page.home')}
          </Link>
        </div>
      </div>
    </div>
  );
}
