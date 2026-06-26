import { MapPin, Clock, Users, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import type { Workshop } from '../../types';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

interface WorkshopCardProps {
  workshop: Workshop;
  onBook?: () => void;
}

export default function WorkshopCard({ workshop, onBook }: WorkshopCardProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr;
  const dateAtFormat = i18n.language?.startsWith('en') ? "MMMM dd, yyyy 'at' HH:mm" : "dd MMMM yyyy 'à' HH:mm";
  const typeLabels: Record<string, string> = {
    atelier: t('workshops.type.atelier'),
    formation: t('workshops.type.formation'),
    conference: t('workshops.type.conference'),
  };

  const typeColors: Record<string, string> = {
    atelier: 'bg-blue-100 text-blue-700',
    formation: 'bg-purple-100 text-purple-700',
    conference: 'bg-amber-100 text-amber-700',
  };

  const spotsLeft = workshop.max_spots - workshop.enrolled;
  const isFull = spotsLeft <= 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
      <div className="h-36 bg-gradient-to-br from-primary-400 to-primary-600 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white/20 text-5xl font-bold">{workshop.title.charAt(0)}</span>
        </div>
        <div className="absolute top-3 left-3">
          <span className={clsx('badge', typeColors[workshop.type] || 'bg-gray-100 text-gray-700')}>
            {typeLabels[workshop.type] || workshop.type}
          </span>
        </div>
        {isFull && (
          <div className="absolute top-3 right-3">
            <span className="badge bg-red-500 text-white">{t('workshops.full')}</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 line-clamp-1">{workshop.title}</h3>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{workshop.description}</p>

        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5 text-primary-400" />
            <span>{workshop.date ? format(new Date(workshop.date), dateAtFormat, { locale: dateLocale }) : ''}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <MapPin className="w-3.5 h-3.5 text-primary-400" />
            <span>{workshop.location}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5 text-primary-400" />
            <span>{workshop.duration} min</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Users className="w-3.5 h-3.5 text-primary-400" />
            <span>{isFull ? t('workshops.full') : t('workshops.spots_left', { count: spotsLeft })}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
          <span className="font-bold text-primary-500 text-lg">
            {workshop.price === 0 ? t('workshops.free') : `${workshop.price}€`}
          </span>
          {onBook && (
            <button
              onClick={onBook}
              disabled={isFull}
              className={clsx('btn-primary text-sm py-1.5 px-3', isFull && 'opacity-50 cursor-not-allowed')}
            >
              {t('workshops.book')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
