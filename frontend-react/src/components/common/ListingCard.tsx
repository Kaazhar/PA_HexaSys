import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import type { Listing } from '../../types';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

interface ListingCardProps {
  listing: Listing;
  onClick?: () => void;
}

export default function ListingCard({ listing, onClick }: ListingCardProps) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr;
  const conditionLabels: Record<string, string> = {
    neuf: t('listings.condition.neuf'),
    bon_etat: t('listings.condition.bon_etat'),
    use: t('listings.condition.use'),
    pieces: t('listings.condition.pieces'),
  };

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden group"
      onClick={onClick ?? (() => navigate(`/annonces/${listing.id}`))}
    >
      
      <div className="h-48 bg-gradient-to-br from-primary-500 to-primary-600 relative overflow-hidden">
        {listing.images ? (
          <img
            src={listing.images.split(',')[0]}
            alt={listing.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white/20 text-6xl font-bold">
              {listing.title?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          <span className={clsx(
            'badge text-xs font-semibold',
            listing.type === 'don' ? 'bg-green-500 text-white' : 'bg-coral-500 text-white'
          )}>
            {listing.type === 'don' ? t('listings.type.don') : t('listings.type.vente')}
          </span>
          {listing.is_sponsored && (
            <span className="badge bg-amber-400 text-white text-xs font-semibold">{t('listing_card.sponsored')}</span>
          )}
        </div>
        {listing.status !== 'active' && (
          <div className="absolute top-3 right-3">
            <span className="badge bg-gray-800/70 text-white text-xs">
              {listing.status === 'pending' ? t('listings.status.pending') : listing.status === 'rejected' ? t('listings.status.rejected') : t('listings.status.sold')}
            </span>
          </div>
        )}
      </div>

      
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 group-hover:text-primary-500 transition-colors line-clamp-1">
          {listing.title}
        </h3>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{listing.description}</p>

        <div className="flex items-center justify-between mt-3">
          <div className="text-xs text-gray-500">{listing.location || t('listing_card.no_location')}</div>
          {listing.condition && (
            <span className="badge-gray text-xs">
              {conditionLabels[listing.condition] || listing.condition}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
          <div className="text-xs text-gray-400">{listing.created_at ? format(new Date(listing.created_at), 'dd MMM yyyy', { locale: dateLocale }) : ''}</div>
          <div>
            {listing.type === 'vente' && listing.price ? (
              <span className="font-bold text-primary-500">{listing.price}€</span>
            ) : (
              <span className="font-bold text-green-600">{t('listings.free')}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
