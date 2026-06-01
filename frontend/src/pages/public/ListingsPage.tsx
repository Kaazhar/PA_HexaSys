import { useState } from 'react';
import { Search, SlidersHorizontal, Package } from 'lucide-react';
import PublicLayout from '../../components/layout/PublicLayout';
import ListingCard from '../../components/common/ListingCard';
import { useQuery } from '@tanstack/react-query';
import { listingService, categoryService } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useTranslation } from 'react-i18next';

export default function ListingsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);

  const { data: listingsData, isLoading } = useQuery({
    queryKey: ['listings', { search, type: selectedType, category: selectedCategory, page }],
    queryFn: () => listingService.getAll({
      search: search || undefined,
      type: selectedType || undefined,
      category: selectedCategory || undefined,
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
          <p className="text-gray-500 mt-2">{total} annonce{total > 1 ? 's' : ''} disponible{total > 1 ? 's' : ''}</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar filters */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <div className="card sticky top-24">
              <div className="flex items-center gap-2 mb-4">
                <SlidersHorizontal className="w-5 h-5 text-primary-500" />
                <h2 className="font-semibold text-gray-900">{t('common.filter')}</h2>
              </div>

              {/* Type filter */}
              <div className="mb-5">
                <label className="label">Type</label>
                <div className="space-y-2">
                  {[
                    { value: '', label: t('common.all') },
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

              {/* Category filter */}
              <div className="mb-5">
                <label className="label">Catégorie</label>
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
                    <span className="text-sm text-gray-700">{t('common.all')}</span>
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

              {(selectedType || selectedCategory) && (
                <button
                  onClick={() => { setSelectedType(''); setSelectedCategory(''); setPage(1); }}
                  className="w-full text-sm text-red-500 hover:text-red-600 font-medium"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1">
            {/* Search bar */}
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

            {/* Results */}
            {isLoading ? (
              <div className="flex justify-center py-20">
                <LoadingSpinner size="lg" />
              </div>
            ) : listings.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">{t('listings.noListings')}</p>
                <p className="text-sm mt-2">Essayez de modifier vos filtres de recherche</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {listings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="btn-secondary py-2 px-4 disabled:opacity-50"
                    >
                      Précédent
                    </button>
                    <span className="flex items-center px-4 text-sm text-gray-600">
                      Page {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="btn-secondary py-2 px-4 disabled:opacity-50"
                    >
                      Suivant
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
