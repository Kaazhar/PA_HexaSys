import { useState } from 'react';
import PublicLayout from '../../components/layout/PublicLayout';
import ListingCard from '../../components/common/ListingCard';
import { useQuery } from '@tanstack/react-query';
import { listingService, categoryService } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useSearchParams, Link } from 'react-router-dom';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import clsx from 'clsx';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function ListingsPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [selectedType, setSelectedType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  const { data: listingsData, isLoading } = useQuery({
    queryKey: ['listings', { search, type: selectedType, category: selectedCategory, location: selectedLocation, page }],
    queryFn: () => listingService.getAll({
      search: search || undefined,
      type: selectedType || undefined,
      category: selectedCategory || undefined,
      location: selectedLocation || undefined,
      status: 'active',
      page,
      limit: 12,
    }),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getAll(),
  });

  const listings = listingsData?.data?.listings || [];
  const total = listingsData?.data?.total || 0;
  const categories = categoriesData?.data || [];
  const totalPages = Math.ceil(total / 12);

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('listings.title')}</h1>
          <p className="text-gray-500 mt-2">{t('listings.subtitle')}</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          
          <aside className="w-full lg:w-64 flex-shrink-0">
            <div className="card sticky top-24">
              <div className="mb-4">
                <h2 className="font-semibold text-gray-900">{t('listings.filters')}</h2>
              </div>

              
              <div className="mb-5">
                <label className="label">{t('listings.filter_location')}</label>
                <input
                  type="text"
                  placeholder={t('listings.location_placeholder')}
                  value={selectedLocation}
                  onChange={(e) => { setSelectedLocation(e.target.value); setPage(1); }}
                  className="input text-sm"
                />
              </div>

              <div className="mb-5">
                <label className="label">{t('listings.filter_type')}</label>
                <div className="space-y-2">
                  {[
                    { value: '', label: t('listings.all_types') },
                    { value: 'don', label: t('listings.type.don') },
                    { value: 'vente', label: t('listings.type.vente') },
                  ].map((option) => (
                    <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        value={option.value}
                        checked={selectedType === option.value}
                        onChange={(e) => { setSelectedType(e.target.value); setPage(1); }}
                        className="text-primary-500"
                      />
                      <span className="text-sm text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              
              <div className="mb-5">
                <label className="label">{t('listings.filter_category')}</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="category"
                      value=""
                      checked={selectedCategory === ''}
                      onChange={() => { setSelectedCategory(''); setPage(1); }}
                      className="text-primary-500"
                    />
                    <span className="text-sm text-gray-700">{t('listings.all_categories')}</span>
                  </label>
                  {categories.map((cat) => (
                    <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="category"
                        value={String(cat.id)}
                        checked={selectedCategory === String(cat.id)}
                        onChange={() => { setSelectedCategory(String(cat.id)); setPage(1); }}
                        className="text-primary-500"
                      />
                      <span className="text-sm text-gray-700">{cat.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {(selectedType || selectedCategory || selectedLocation) && (
                <button
                  onClick={() => { setSelectedType(''); setSelectedCategory(''); setSelectedLocation(''); setPage(1); }}
                  className="w-full text-sm text-red-500 hover:text-red-600 font-medium"
                >
                  {t('listings.reset_filters')}
                </button>
              )}
            </div>
          </aside>

          
          <div className="flex-1">
            
            <div className="mb-6">
              <input
                type="text"
                placeholder={t('listings.search')}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="input py-3 text-base"
              />
            </div>

            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500">{total} {t('listings.results')}</span>
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            
              </div>
            </div>


            {isLoading ? (
              <div className="flex justify-center py-20">
                <LoadingSpinner size="lg" />
              </div>
            ) : listings.length === 0 ? (
              <EmptyState message={t('listings.noListings')} />
            ) : viewMode === 'map' ? (
              <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm h-[600px]">
                <MapContainer center={[48.8566, 2.3522]} zoom={12} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {listings.filter(l => l.latitude && l.longitude).map((listing) => (
                    <Marker key={listing.id} position={[listing.latitude, listing.longitude]}>
                      <Popup>
                        <div className="min-w-[180px]">
                          <p className="font-semibold text-gray-900 mb-1 text-sm">{listing.title}</p>
                          <p className="text-xs text-gray-500 mb-2">{listing.location}</p>
                          <p className="text-xs font-bold text-primary-600 mb-2">
                            {listing.type === 'don' ? t('listings.type.don') : `${listing.price}€`}
                          </p>
                          <Link to={`/annonces/${listing.id}`} className="text-xs text-primary-500 hover:underline">{t('listings.see_listing')}</Link>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {listings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>

                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-8" />
              </>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
