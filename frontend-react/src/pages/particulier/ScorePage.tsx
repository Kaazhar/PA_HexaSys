import DashboardLayout from '../../components/layout/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { scoreService } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import clsx from 'clsx';
import { particulierSidebar, proSidebar, salarieSidebar, adminSidebar } from '../../config/sidebars';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

const levels = [
  { key: 'debutant',      name: 'Débutant',       min: 0,   max: 99,       color: 'bg-green-200',  ring: '#86efac', medal: '🌱' },
  { key: 'intermediaire', name: 'Intermédiaire',   min: 100, max: 299,      color: 'bg-green-400',  ring: '#4ade80', medal: '🌿' },
  { key: 'avance',        name: 'Avancé',          min: 300, max: 699,      color: 'bg-green-600',  ring: '#16a34a', medal: '🏆' },
  { key: 'expert',        name: 'Expert',          min: 700, max: Infinity, color: 'bg-[#2D5016]',  ring: '#2D5016', medal: '🌟' },
];

const RADIUS = 72;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function CircleProgress({ pct, color, points }: { pct: number; color: string; points: number }) {
  const offset = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="180" height="180" className="-rotate-90">
        <circle cx="90" cy="90" r={RADIUS} fill="none" stroke="#e5e7eb" strokeWidth="12" />
        <circle
          cx="90" cy="90" r={RADIUS} fill="none"
          stroke={color} strokeWidth="12"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-black text-gray-900">{points}</span>
        <span className="text-xs text-gray-400 font-medium">points</span>
      </div>
    </div>
  );
}

export default function ScorePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const sidebar = user?.role === 'professionnel' ? proSidebar : user?.role === 'salarie' ? salarieSidebar : user?.role === 'admin' ? adminSidebar : particulierSidebar;

  const { data, isLoading } = useQuery({
    queryKey: ['score', 'me'],
    queryFn: () => scoreService.getMyScore(),
  });

  const score = data?.data?.score;
  const entries = data?.data?.entries || [];

  const { data: leaderData } = useQuery({
    queryKey: ['score-leaderboard'],
    queryFn: () => scoreService.getLeaderboard(),
  });
  const leaderboard = leaderData?.data || [];

  const currentLevel = levels.find(l => (score?.total_points || 0) >= l.min && (score?.total_points || 0) <= l.max) || levels[0];
  const nextLevel = levels[levels.indexOf(currentLevel) + 1];
  const progress = nextLevel
    ? Math.round(((score?.total_points || 0) - currentLevel.min) / (nextLevel.min - currentLevel.min) * 100)
    : 100;

  return (
    <DashboardLayout sidebarItems={sidebar} title={t('score.title')}>
      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="space-y-6 max-w-3xl">

          <div className="bg-gradient-to-br from-[#2D5016] to-[#3d6b20] rounded-2xl p-8 text-white">
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <div className="relative">
                <svg width="180" height="180" className="-rotate-90">
                  <circle cx="90" cy="90" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="12" />
                  <circle
                    cx="90" cy="90" r={RADIUS} fill="none"
                    stroke="rgba(255,255,255,0.9)" strokeWidth="12"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-white">{score?.total_points || 0}</span>
                  <span className="text-xs text-white/60 font-medium">points</span>
                </div>
              </div>

              <div className="flex-1 text-center sm:text-left">
                <div className="text-4xl mb-2">{currentLevel.medal}</div>
                <p className="text-white/70 text-sm mb-1">{t('score.current_level')}</p>
                <h2 className="text-3xl font-black text-white mb-3">{score?.level || t(`score.levels.${currentLevel.key}`)}</h2>
                {nextLevel ? (
                  <div>
                    <div className="flex justify-between text-xs text-white/60 mb-1.5">
                      <span>{t(`score.levels.${currentLevel.key}`)}</span>
                      <span>{t(`score.levels.${nextLevel.key}`)} — {nextLevel.min} pts</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div className="bg-white rounded-full h-2 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-xs text-white/50 mt-1.5">
                      {t('score.remaining', { count: nextLevel.min - (score?.total_points || 0) })}
                    </p>
                  </div>
                ) : (
                  <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Niveau maximum atteint
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { value: `${score?.waste_avoided_kg || 0} kg`, label: t('score.wasteAvoided'), bg: 'bg-green-50 border-green-100' },
              { value: `${score?.co2_saved_kg || 0} kg`,     label: t('score.co2Saved'),     bg: 'bg-blue-50 border-blue-100' },
              { value: `${score?.water_saved_liters || 0} L`, label: t('score.waterSaved'),   bg: 'bg-cyan-50 border-cyan-100' },
            ].map((item, i) => (
              <div key={i} className={clsx('rounded-xl border p-4 text-center', item.bg)}>
                <p className="text-xl font-black text-gray-900">{item.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{t('score.levels_title')}</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {levels.map((level) => {
                const isActive = currentLevel.key === level.key;
                const isDone = (score?.total_points || 0) > level.max;
                return (
                  <div key={level.key} className={clsx('flex items-center gap-4 px-5 py-3.5', isActive && 'bg-[#2D5016]/5')}>
                    <span className="text-xl">{level.medal}</span>
                    <div className="flex-1">
                      <p className={clsx('text-sm font-semibold', isActive ? 'text-[#2D5016]' : isDone ? 'text-gray-400' : 'text-gray-700')}>
                        {t(`score.levels.${level.key}`)}
                      </p>
                      <p className="text-xs text-gray-400">{level.min} — {level.max === Infinity ? '∞' : level.max} pts</p>
                    </div>
                    {isActive && <span className="badge-green text-xs font-semibold">{t('score.current_badge')}</span>}
                    {isDone && <span className="text-green-500 text-sm">✓</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {leaderboard.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">{t('score.leaderboard_title')}</h2>
              </div>
              <ol className="divide-y divide-gray-50">
                {leaderboard.map((entry, i) => (
                  <li key={entry.user_id} className={clsx('flex items-center gap-4 px-5 py-3', i < 3 && 'bg-amber-50/50')}>
                    <div className={clsx(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0',
                      i === 0 ? 'bg-amber-400 text-white' :
                      i === 1 ? 'bg-gray-300 text-white' :
                      i === 2 ? 'bg-amber-700 text-white' :
                      'bg-gray-100 text-gray-500'
                    )}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{entry.firstname} {entry.lastname.charAt(0)}.</p>
                      <p className="text-xs text-gray-400">{entry.level}</p>
                    </div>
                    <span className="font-black text-[#2D5016] text-sm">{entry.total_points} pts</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {entries.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">{t('score.history_title')}</h2>
              </div>
              <ul className="divide-y divide-gray-50">
                {entries.map((entry: { id: number; reason: string; points: number; created_at: string }) => (
                  <li key={entry.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm text-gray-800">{entry.reason}</p>
                      <p className="text-xs text-gray-400">{entry.created_at ? format(new Date(entry.created_at), 'dd MMM yyyy', { locale: fr }) : ''}</p>
                    </div>
                    <span className="font-bold text-[#2D5016] text-sm">+{entry.points} pts</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
