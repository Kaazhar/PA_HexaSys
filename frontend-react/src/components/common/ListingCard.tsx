import { MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import type { Listing } from '../../types';
import clsx from 'clsx';

interface ListingCardProps {
  listing: Listing;
  onClick?: () => void;
}

export default function ListingCard({ listing, onClick }: ListingCardProps) {
  const navigate = useNavigate();
  const conditionLabels: Record<string, string> = {
    neuf: 'Neuf',
    bon_etat: 'Bon état',
    use: 'Usé',
    pieces: 'Pour pièces',
  };

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden group"
      onClick={onClick ?? (() => navigate(`/annonces/${listing.id}`))}
    >
      {/* Image */}
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
        <div className="absolute top-3 left-3">
          <span className={clsx(
            'badge text-xs font-semibold',
            listing.type === 'don' ? 'bg-green-500 text-white' : 'bg-coral-500 text-white'
          )}>
            {listing.type === 'don' ? 'Don' : 'Vente'}
          </span>
        </div>
        {listing.status !== 'active' && (
          <div className="absolute top-3 right-3">
            <span className="badge bg-gray-800/70 text-white text-xs">
              {listing.status === 'pending' ? 'En attente' : listing.status === 'rejected' ? 'Rejeté' : 'Vendu'}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 group-hover:text-primary-500 transition-colors line-clamp-1">
          {listing.title}
        </h3>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{listing.description}</p>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <MapPin className="w-3 h-3" />
            <span>{listing.location || 'Non précisé'}</span>
          </div>
          {listing.condition && (
            <span className="badge-gray text-xs">
              {conditionLabels[listing.condition] || listing.condition}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            <span>{listing.created_at ? format(new Date(listing.created_at), 'dd MMM yyyy', { locale: fr }) : ''}</span>
          </div>
          <div>
            {listing.type === 'vente' && listing.price ? (
              <span className="font-bold text-primary-500">{listing.price}€</span>
            ) : (
              <span className="font-bold text-green-600">Gratuit</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
