import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Star, Package, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import PublicLayout from '../../components/layout/PublicLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { userService, reviewService } from '../../services/api';
import clsx from 'clsx';

const roleLabels: Record<string, string> = {
  particulier: 'Particulier',
  professionnel: 'Professionnel',
  salarie: 'Salarié',
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={clsx('w-4 h-4', s <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200')}
        />
      ))}
    </div>
  );
}

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-profile', id],
    queryFn: () => userService.getPublicProfile(Number(id)),
    enabled: !!id,
  });

  const { data: reviewData } = useQuery({
    queryKey: ['user-reviews', id],
    queryFn: () => reviewService.getForUser(Number(id)),
    enabled: !!id,
  });

  const profile = data?.data;
  const activeListings = profile?.active_listings ?? [];
  const reviewCount = profile?.review_count ?? 0;
  const avgRating = profile?.avg_rating ?? 0;
  const reviews = reviewData?.data?.reviews ?? [];

  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/annonces" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Link>

        {isLoading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : isError || !profile?.user ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">Profil introuvable</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Profile header */}
            <div className="card">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-600 font-bold text-2xl">
                    {profile.user.firstname?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h1 className="text-xl font-bold text-gray-900">
                      {profile.user.firstname} {profile.user.lastname}
                    </h1>
                    {profile.user.siret_verified && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                        <BadgeCheck className="w-3 h-3" />
                        Pro vérifié
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-2">
                    {roleLabels[profile.user.role] || profile.user.role}
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      Membre depuis {format(new Date(profile.user.created_at), 'MMMM yyyy', { locale: fr })}
                    </span>
                    {reviewCount > 0 && (
                      <span className="flex items-center gap-1.5">
                        <Star className="w-4 h-4 text-amber-400" />
                        {avgRating.toFixed(1)} ({reviewCount} avis)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Active listings */}
            {activeListings.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary-500" />
                  Annonces actives ({activeListings.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeListings.map((listing: any) => (
                    <Link key={listing.id} to={`/annonces/${listing.id}`} className="card hover:shadow-md transition-shadow group">
                      <div className="flex items-start justify-between mb-2">
                        <span className={clsx('badge text-xs',
                          listing.type === 'don' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        )}>
                          {listing.type === 'don' ? 'Don' : 'Vente'}
                        </span>
                        {listing.price && listing.type === 'vente' && (
                          <span className="font-semibold text-sm text-gray-900">{listing.price}€</span>
                        )}
                      </div>
                      <p className="font-medium text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2">
                        {listing.title}
                      </p>
                      {listing.category && (
                        <p className="text-xs text-gray-400 mt-1">{listing.category.name}</p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400" />
                  Avis reçus ({reviewCount})
                </h2>
                <div className="space-y-3">
                  {reviews.map((review: any) => (
                    <div key={review.id} className="card">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                              {review.reviewer?.firstname?.charAt(0)?.toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            {review.reviewer?.firstname} {review.reviewer?.lastname}
                          </span>
                        </div>
                        <StarRating rating={review.rating} />
                      </div>
                      {review.comment && (
                        <p className="text-sm text-gray-600">{review.comment}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {format(new Date(review.created_at), 'dd MMM yyyy', { locale: fr })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
