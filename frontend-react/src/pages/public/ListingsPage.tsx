import { useState } from 'react';
import { Search, SlidersHorizontal, Package, MapPin } from 'lucide-react';
import PublicLayout from '../../components/layout/PublicLayout';
import ListingCard from '../../components/common/ListingCard';
import { useQuery } from '@tanstack/react-query';
import { listingService, categoryService } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useSearchParams } from 'react-router-dom';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import { useTranslation } from 'react-i18next';

export default function ListingsPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [selectedType, setSelectedType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [page, setPage] = useState(1);

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
              <div className="flex items-center gap-2 mb-4">
                <SlidersHorizontal className="w-5 h-5 text-primary-500" />
                <h2 className="font-semibold text-gray-900">{t('listings.filters')}</h2>
              </div>

              
              <div className="mb-5">
                <label className="label flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {t('listings.filter_location')}
                </label>
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
            
            <div className="relative mb-6">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t('listings.search')}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="input pl-12 py-3 text-base"
              />
            </div>

            
            {isLoading ? (
              <div className="flex justify-center py-20">
                <LoadingSpinner size="lg" />
              </div>
            ) : listings.length === 0 ? (
              <EmptyState icon={<Package className="w-10 h-10" />} message={t('listings.noListings')} />
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
