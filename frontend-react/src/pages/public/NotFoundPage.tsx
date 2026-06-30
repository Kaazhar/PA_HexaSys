import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-beige-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-black text-primary-500 mb-2">404</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('not_found_page.title')}</h1>
        <p className="text-gray-500 mb-8">{t('not_found_page.desc')}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => window.history.back()} className="btn-secondary">{t('not_found_page.back')}</button>
          <Link to="/" className="btn-primary">{t('not_found_page.home')}</Link>
        </div>
      </div>
    </div>
  );
}
