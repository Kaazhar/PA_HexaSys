import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import { useQuery } from '@tanstack/react-query';
import { listingService, workshopService, publicStatsService } from '../../services/api';
import ListingCard from '../../components/common/ListingCard';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr;

  const { data: listingsData } = useQuery({
    queryKey: ['listings', 'recent'],
    queryFn: () => listingService.getAll({ limit: 4, status: 'active' }),
  });

  const { data: workshopsData } = useQuery({
    queryKey: ['workshops', 'upcoming'],
    queryFn: () => workshopService.getAll({ status: 'active', limit: 3 }),
  });

  const { data: statsData } = useQuery({
    queryKey: ['public-stats'],
    queryFn: () => publicStatsService.get(),
    staleTime: 5 * 60 * 1000,
  });

  const listings = listingsData?.data?.listings || [];
  const workshops = workshopsData?.data?.workshops || [];
  const stats = statsData?.data;

  return (
    <PublicLayout>

      <section className="bg-[#2D5016] text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-6">
            {t('home.hero_title')}
          </h1>
          <p className="text-lg text-white/75 mb-10 leading-relaxed">
            {t('home.hero_subtitle')}
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/register" className="inline-flex items-center bg-[#F5E6D3] text-[#2D5016] px-7 py-3.5 rounded-xl font-bold hover:bg-white transition-colors shadow-lg">
              {t('home.hero_cta_primary')}
            </Link>
            <Link to="/annonces" className="inline-flex items-center gap-2 border-2 border-white/30 text-white px-7 py-3.5 rounded-xl font-semibold hover:bg-white/10 transition-colors">
              {t('home.hero_cta_secondary')}
            </Link>
          </div>
        </div>
      </section>

      <section className="py-10 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: stats?.total_users ?? '…', label: t('home.stat_users') },
              { value: stats?.active_listings ?? '…', label: t('home.stat_listings') },
              { value: stats ? `${Math.round(stats.waste_avoided_kg)} kg` : '…', label: t('home.stat_waste') },
              { value: stats ? `${Math.round(stats.co2_saved_kg)} kg` : '…', label: t('home.stat_co2') },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-1 py-4">
                <p className="text-3xl font-black text-gray-900">{s.value}</p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">{t('home.listings_title')}</h2>
              <p className="text-gray-500 mt-2">{t('home.listings_subtitle')}</p>
            </div>
            <Link to="/annonces" className="text-[#2D5016] font-medium hover:text-[#3a6a1e] transition-colors text-sm">
              {t('home.see_all')}
            </Link>
          </div>
          {listings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <p>{t('home.no_listings')}</p>
            </div>
          )}
        </div>
      </section>

      {workshops.length > 0 && (
        <section className="py-20 bg-[#F5E6D3]/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">{t('home.workshops_title')}</h2>
                <p className="text-gray-500 mt-2">{t('home.workshops_subtitle')}</p>
              </div>
              <Link to="/formations" className="text-[#2D5016] font-medium hover:text-[#3a6a1e] transition-colors text-sm">
                {t('home.see_all')}
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {workshops.map((w) => (
                <Link key={w.id} to={`/formations/${w.id}`} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                  <div className="bg-[#2D5016] px-5 py-4">
                    <span className="text-xs font-semibold text-white/60 uppercase tracking-wide">{w.type}</span>
                    <h3 className="text-white font-bold mt-1 line-clamp-2">{w.title}</h3>
                  </div>
                  <div className="p-5 space-y-2.5">
                    <div className="text-sm text-gray-500">
                      {format(new Date(w.date), 'dd MMMM yyyy à HH:mm', { locale: dateLocale })}
                    </div>
                    <div className="text-sm text-gray-500">{w.location}</div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-sm text-gray-500">{w.enrolled || 0}/{w.max_spots} {t('home.enrolled')}</span>
                      <span className="font-bold text-[#2D5016]">{w.price === 0 ? t('home.free') : `${w.price}€`}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-24 bg-gradient-to-br from-[#2D5016] to-[#1e3a0f]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">{t('home.cta_title')}</h2>
          <p className="text-white/70 text-lg mb-10">{t('home.cta_subtitle')}</p>
          <Link to="/register" className="inline-flex items-center bg-[#C97664] text-white px-10 py-4 rounded-xl font-bold hover:bg-[#b8604f] transition-colors text-lg shadow-xl">
            {t('home.cta_button')}
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
