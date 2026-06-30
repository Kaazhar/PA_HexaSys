import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { bookingService } from '../../services/api';
import { particulierSidebar, adminSidebar } from '../../config/sidebars';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { format, isSameDay, isSameMonth, isToday, isPast, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import type { WorkshopBooking } from '../../types';
import { useTranslation } from 'react-i18next';

const TYPE_COLORS: Record<string, string> = {
  atelier: 'bg-green-500',
  formation: 'bg-blue-500',
  conference: 'bg-purple-500',
};

export default function MonPlanningPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const sidebar = user?.role === 'admin' ? adminSidebar : particulierSidebar;

  const TYPE_LABELS: Record<string, string> = {
    atelier: t('planning.type_atelier'),
    formation: t('planning.type_formation'),
    conference: t('planning.type_conference'),
  };

  const DAYS: string[] = t('salarie_planning.days', { returnObjects: true }) as string[];

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => bookingService.getMyBookings(),
  });

  const bookings: WorkshopBooking[] = data?.data ?? [];

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    const days: Date[] = [];
    let d = start;
    while (d <= end) {
      days.push(d);
      d = addDays(d, 1);
    }
    return days;
  }, [currentMonth]);

  const getBookingsForDay = (day: Date) =>
    bookings.filter(b => b.workshop && isSameDay(new Date(b.workshop.date), day));

  const selectedDayBookings = selectedDay ? getBookingsForDay(selectedDay) : [];

  const upcoming = bookings
    .filter(b => b.workshop && !isPast(new Date(b.workshop.date)))
    .sort((a, b) => new Date(a.workshop!.date).getTime() - new Date(b.workshop!.date).getTime());

  const past = bookings
    .filter(b => b.workshop && isPast(new Date(b.workshop.date)))
    .sort((a, b) => new Date(b.workshop!.date).getTime() - new Date(a.workshop!.date).getTime());

  return (
    <DashboardLayout sidebarItems={sidebar} title={t('planning.title')}>
      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium text-gray-600">{t('planning.no_bookings')}</p>
          <p className="text-sm mt-1">{t('planning.no_bookings_sub')}</p>
          <Link to="/formations" className="btn-primary mt-6 inline-block">
            {t('planning.see_workshops')}
          </Link>
        </div>
      ) : (
        <div className="space-y-6">

          
          <div className="card">
            
            <div className="flex items-center justify-between mb-6">
              <button type="button" onClick={() => { setCurrentMonth(subMonths(currentMonth, 1)); setSelectedDay(null); }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h2 className="text-lg font-bold text-gray-900 capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: fr })}
              </h2>
              <button type="button" onClick={() => { setCurrentMonth(addMonths(currentMonth, 1)); setSelectedDay(null); }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
              ))}
            </div>

            
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                const dayBookings = getBookingsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                const isTodayDay = isToday(day);

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={clsx(
                      'relative flex flex-col items-center py-2 px-1 rounded-xl transition-all min-h-[56px]',
                      !isCurrentMonth && 'opacity-30',
                      isSelected ? 'bg-[#2D5016] text-white' : isTodayDay ? 'bg-green-50 border-2 border-[#2D5016]' : 'hover:bg-gray-50',
                    )}
                  >
                    <span className={clsx(
                      'text-sm font-medium',
                      isSelected ? 'text-white' : isTodayDay ? 'text-[#2D5016] font-bold' : 'text-gray-700'
                    )}>
                      {format(day, 'd')}
                    </span>

                    
                    {dayBookings.length > 0 && (
                      <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                        {dayBookings.slice(0, 3).map((b, j) => (
                          <span
                            key={j}
                            className={clsx(
                              'w-1.5 h-1.5 rounded-full',
                              isSelected ? 'bg-white' : TYPE_COLORS[b.workshop?.type ?? 'atelier']
                            )}
                          />
                        ))}
                        {dayBookings.length > 3 && (
                          <span className={clsx('text-[9px] font-bold', isSelected ? 'text-white' : 'text-gray-400')}>
                            +{dayBookings.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100">
              {Object.entries(TYPE_COLORS).map(([type, color]) => (
                <span key={type} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className={clsx('w-2.5 h-2.5 rounded-full', color)} />
                  {TYPE_LABELS[type]}
                </span>
              ))}
              <span className="flex items-center gap-1.5 text-xs text-gray-500 ml-auto">
                <span className="w-4 h-4 rounded-lg border-2 border-[#2D5016] inline-block" />
                {t('planning.today')}
              </span>
            </div>
          </div>

          
          {selectedDay && (
            <div className="card border-2 border-[#2D5016]/20">
              <h3 className="font-semibold text-gray-900 mb-3 capitalize">
                {format(selectedDay, 'EEEE d MMMM yyyy', { locale: fr })}
              </h3>
              {selectedDayBookings.length === 0 ? (
                <p className="text-sm text-gray-400">{t('planning.no_day_bookings')}</p>
              ) : (
                <div className="space-y-3">
                  {selectedDayBookings.map(b => (
                    <WorkshopCard key={b.id} booking={b} />
                  ))}
                </div>
              )}
            </div>
          )}

          
          {upcoming.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">{t('planning.upcoming')} ({upcoming.length})</h3>
              <div className="space-y-3">
                {upcoming.map(b => (
                  <WorkshopCard key={b.id} booking={b} />
                ))}
              </div>
            </div>
          )}

          
          {past.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-500 mb-4">{t('planning.past')} ({past.length})</h3>
              <div className="space-y-3 opacity-60">
                {past.map(b => (
                  <WorkshopCard key={b.id} booking={b} past />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}

function WorkshopCard({ booking, past = false }: { booking: WorkshopBooking; past?: boolean }) {
  const { t } = useTranslation();
  const ws = booking.workshop;
  if (!ws) return null;

  const TYPE_LABELS: Record<string, string> = {
    atelier: t('planning.type_atelier'),
    formation: t('planning.type_formation'),
    conference: t('planning.type_conference'),
  };

  const date = new Date(ws.date);
  const typeColor = TYPE_COLORS[ws.type] ?? 'bg-gray-400';
  const typeLabel = TYPE_LABELS[ws.type] ?? ws.type;

  return (
    <div className={clsx(
      'flex items-start gap-4 p-4 rounded-xl border transition-all',
      past ? 'border-gray-100 bg-gray-50' : 'border-gray-200 hover:border-[#2D5016]/30 hover:bg-green-50/30'
    )}>
      
      <div className="flex-shrink-0 w-14 text-center">
        <div className={clsx('w-14 h-14 rounded-xl flex flex-col items-center justify-center', past ? 'bg-gray-200' : 'bg-[#2D5016]')}>
          <span className={clsx('text-xs font-semibold uppercase', past ? 'text-gray-500' : 'text-green-200')}>
            {format(date, 'MMM', { locale: fr })}
          </span>
          <span className={clsx('text-xl font-bold leading-none', past ? 'text-gray-600' : 'text-white')}>
            {format(date, 'd')}
          </span>
        </div>
      </div>

      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', typeColor)} />
          <span className="text-xs font-medium text-gray-400">{typeLabel}</span>
        </div>
        <p className="font-semibold text-gray-900 truncate">{ws.title}</p>
        <div className="flex flex-wrap gap-3 mt-1.5">
          <span className="text-xs text-gray-500">{format(date, 'HH:mm')} — {ws.duration} min</span>
          <span className="text-xs text-gray-500">{ws.location}</span>
        </div>
      </div>

      
      <div className="flex-shrink-0 flex flex-col items-end gap-2">
        <span className={clsx('text-sm font-bold', past ? 'text-gray-400' : 'text-[#2D5016]')}>
          {ws.price === 0 ? t('planning.free') : `${ws.price}€`}
        </span>
        <Link
          to={`/formations/${ws.id}`}
          className="text-xs text-gray-400 hover:text-[#2D5016] transition-colors"
        >
          {t('planning.see')}
        </Link>
      </div>
    </div>
  );
}
