import { Calendar, MapPin, Users, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { salarieService } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import clsx from 'clsx';
import { salarieSidebar } from '../../config/sidebars';

const statusColors: Record<string, string> = {
  active: 'bg-green-500',
  pending: 'bg-amber-400',
  cancelled: 'bg-red-400',
  draft: 'bg-gray-400',
};

const typeLabels: Record<string, string> = {
  atelier: 'Atelier',
  formation: 'Formation',
  conference: 'Conférence',
};

interface Workshop {
  id: number;
  title: string;
  date: string;
  duration: number;
  location: string;
  enrolled: number;
  max_spots: number;
  status: string;
  type: string;
  price: number;
}

export default function SalariePlanning() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selected, setSelected] = useState<Workshop | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['salarie', 'workshops'],
    queryFn: () => salarieService.getMyWorkshops(),
  });

  const workshops: Workshop[] = data?.data || [];

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start to Monday
  const startPad = (monthStart.getDay() + 6) % 7;
  const paddedDays = [...Array(startPad).fill(null), ...days];

  const getWorkshopsForDay = (day: Date) =>
    workshops.filter(ws => ws.date && isSameDay(parseISO(ws.date), day));

  // Upcoming sorted
  const upcoming = workshops
    .filter(ws => ws.date && new Date(ws.date) >= new Date() && ws.status !== 'cancelled')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <DashboardLayout sidebarItems={salarieSidebar} title="Espace Salarié">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Mon planning</h2>
          <p className="text-gray-500 text-sm mt-0.5">Vue calendrier de vos formations</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <div className="lg:col-span-2 card">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h3 className="font-semibold text-gray-900 capitalize">
                  {format(currentMonth, 'MMMM yyyy', { locale: fr })}
                </h3>
                <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-2">
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
                  <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-1">
                {paddedDays.map((day, i) => {
                  if (!day) return <div key={`pad-${i}`} />;
                  const dayWorkshops = getWorkshopsForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  return (
                    <div
                      key={day.toISOString()}
                      className={clsx(
                        'min-h-[60px] p-1 rounded-lg border transition-colors',
                        isCurrentMonth ? 'bg-white border-gray-100' : 'bg-gray-50 border-transparent',
                        isToday(day) && 'border-primary-300 bg-primary-50',
                        dayWorkshops.length > 0 && 'cursor-pointer hover:border-primary-200'
                      )}
                      onClick={() => dayWorkshops.length > 0 && setSelected(dayWorkshops[0])}
                    >
                      <div className={clsx(
                        'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1',
                        isToday(day) ? 'bg-primary-500 text-white' : 'text-gray-600'
                      )}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-0.5">
                        {dayWorkshops.slice(0, 2).map(ws => (
                          <div
                            key={ws.id}
                            className={clsx('text-xs px-1 py-0.5 rounded text-white truncate', statusColors[ws.status] || 'bg-gray-400')}
                          >
                            {ws.title}
                          </div>
                        ))}
                        {dayWorkshops.length > 2 && (
                          <div className="text-xs text-gray-400 px-1">+{dayWorkshops.length - 2}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                {Object.entries({ active: 'Actif', pending: 'En attente', cancelled: 'Annulé' }).map(([k, v]) => (
                  <span key={k} className="flex items-center gap-1.5">
                    <span className={clsx('w-2.5 h-2.5 rounded-full', statusColors[k])} />
                    {v}
                  </span>
                ))}
              </div>
            </div>

            {/* Sidebar: upcoming + detail */}
            <div className="space-y-4">
              {selected ? (
                <div className="card border-l-4 border-primary-400">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">{selected.title}</h3>
                    <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400" />
                      {format(parseISO(selected.date), 'EEEE dd MMMM yyyy à HH:mm', { locale: fr })}
                    </div>
                    <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" />{selected.duration} min</div>
                    {selected.location && <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" />{selected.location}</div>}
                    <div className="flex items-center gap-2"><Users className="w-4 h-4 text-gray-400" />{selected.enrolled}/{selected.max_spots} inscrits</div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs badge-gray">{typeLabels[selected.type] || selected.type}</span>
                    <span className="font-bold text-primary-500">{selected.price === 0 ? 'Gratuit' : `${selected.price}€`}</span>
                  </div>
                </div>
              ) : null}

              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-3">À venir</h3>
                {upcoming.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Aucune formation à venir</p>
                ) : (
                  <ul className="space-y-3">
                    {upcoming.slice(0, 5).map(ws => (
                      <li
                        key={ws.id}
                        className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg -mx-2 transition-colors"
                        onClick={() => { setSelected(ws); setCurrentMonth(parseISO(ws.date)); }}
                      >
                        <div className="flex-shrink-0 text-center bg-primary-50 rounded-lg px-2 py-1 min-w-[44px]">
                          <div className="text-xs text-primary-400 font-medium uppercase">
                            {format(parseISO(ws.date), 'MMM', { locale: fr })}
                          </div>
                          <div className="text-lg font-bold text-primary-600 leading-none">
                            {format(parseISO(ws.date), 'd')}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{ws.title}</p>
                          <p className="text-xs text-gray-500">{format(parseISO(ws.date), 'HH:mm')} · {ws.enrolled}/{ws.max_spots}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
