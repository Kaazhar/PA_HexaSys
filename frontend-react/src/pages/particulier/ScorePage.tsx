import { LayoutDashboard, Tag, PlusCircle, Package, Star, Calendar, BookOpen, Leaf, Droplets, Wind, TrendingUp } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { scoreService } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import clsx from 'clsx';

const sidebarItems = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Mes annonces', path: '/annonces/mes-annonces', icon: <Tag className="w-4 h-4" /> },
  { label: 'Créer une annonce', path: '/annonces/creer', icon: <PlusCircle className="w-4 h-4" /> },
  { label: 'Demande conteneur', path: '/conteneurs/demande', icon: <Package className="w-4 h-4" /> },
  { label: 'Mon score', path: '/score', icon: <Star className="w-4 h-4" /> },
  { label: 'Planning', path: '/planning', icon: <Calendar className="w-4 h-4" /> },
  { label: 'Formations', path: '/annonces', icon: <BookOpen className="w-4 h-4" /> },
];

const levels = [
  { name: 'Débutant', min: 0, max: 99, color: 'bg-gray-400', textColor: 'text-gray-600', emoji: '🌱' },
  { name: 'Intermédiaire', min: 100, max: 299, color: 'bg-blue-400', textColor: 'text-blue-600', emoji: '🌿' },
  { name: 'Avancé', min: 300, max: 699, color: 'bg-primary-500', textColor: 'text-primary-600', emoji: '🌳' },
  { name: 'Expert', min: 700, max: Infinity, color: 'bg-amber-500', textColor: 'text-amber-600', emoji: '🏆' },
];

export default function ScorePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['score', 'me'],
    queryFn: () => scoreService.getMyScore(),
  });

  const score = data?.data?.score;
  const entries = data?.data?.entries || [];

  const currentLevel = levels.find(l => (score?.total_points || 0) >= l.min && (score?.total_points || 0) <= l.max) || levels[0];
  const nextLevel = levels[levels.indexOf(currentLevel) + 1];
  const progress = nextLevel ? Math.round(((score?.total_points || 0) - currentLevel.min) / (nextLevel.min - currentLevel.min) * 100) : 100;

  // Build chart data from entries
  const chartData = entries.slice().reverse().map((e: { created_at: string; points: number }) => ({
    date: e.created_at ? format(new Date(e.created_at), 'dd MMM', { locale: fr }) : '',
    points: e.points,
  }));

  return (
    <DashboardLayout sidebarItems={sidebarItems} title="Mon score upcycling">
      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="space-y-6 max-w-3xl">
          {/* Big score */}
          <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-8 text-white text-center">
            <div className="text-6xl mb-2">{currentLevel.emoji}</div>
            <p className="text-white/70 uppercase tracking-widest text-sm mb-1">Niveau</p>
            <h2 className="text-3xl font-bold mb-4">{score?.level || currentLevel.name}</h2>
            <div className="text-6xl font-black mb-2">{score?.total_points || 0}</div>
            <p className="text-white/70">points upcycling</p>

            {nextLevel && (
              <div className="mt-5 max-w-xs mx-auto">
                <div className="flex justify-between text-xs text-white/70 mb-1">
                  <span>{currentLevel.name}</span>
                  <span>{nextLevel.name} à {nextLevel.min} pts</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div className="bg-white rounded-full h-2 transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-white/70 mt-1 text-center">
                  Plus que {(nextLevel.min - (score?.total_points || 0))} points pour le niveau suivant
                </p>
              </div>
            )}
          </div>

          {/* Environmental impact */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card text-center">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Leaf className="w-6 h-6 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{score?.waste_avoided_kg || 0} kg</p>
              <p className="text-sm text-gray-500 mt-1">Déchets évités</p>
            </div>
            <div className="card text-center">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Wind className="w-6 h-6 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{score?.co2_saved_kg || 0} kg</p>
              <p className="text-sm text-gray-500 mt-1">CO₂ économisé</p>
            </div>
            <div className="card text-center">
              <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Droplets className="w-6 h-6 text-cyan-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{score?.water_saved_liters || 0} L</p>
              <p className="text-sm text-gray-500 mt-1">Eau économisée</p>
            </div>
          </div>

          {/* Levels */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Niveaux</h2>
            <div className="space-y-3">
              {levels.map((level) => {
                const isActive = currentLevel.name === level.name;
                return (
                  <div key={level.name} className={clsx('flex items-center gap-4 p-3 rounded-xl transition-all', isActive ? 'bg-primary-50 border border-primary-200' : 'border border-gray-100')}>
                    <span className="text-2xl">{level.emoji}</span>
                    <div className="flex-1">
                      <p className={clsx('font-semibold', isActive ? 'text-primary-700' : 'text-gray-700')}>{level.name}</p>
                      <p className="text-xs text-gray-500">{level.min} — {level.max === Infinity ? '∞' : level.max} points</p>
                    </div>
                    {isActive && <span className="badge-green text-xs">Niveau actuel</span>}
                    {(score?.total_points || 0) > level.max && <span className="badge bg-gray-100 text-gray-500 text-xs">Complété ✓</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Score history chart */}
          {chartData.length > 1 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary-500" />
                <h2 className="font-semibold text-gray-900">Historique des points</h2>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v} pts`, 'Points gagnés']} />
                  <Line type="monotone" dataKey="points" stroke="#2D5016" strokeWidth={2} dot={{ fill: '#2D5016', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Score history list */}
          {entries.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">Historique des actions</h2>
              <ul className="space-y-2">
                {entries.map((entry: { id: number; action: string; reason: string; points: number; created_at: string }) => (
                  <li key={entry.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{entry.reason}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {entry.created_at ? format(new Date(entry.created_at), 'dd MMM yyyy', { locale: fr }) : ''}
                      </p>
                    </div>
                    <span className="font-bold text-primary-500 text-sm">+{entry.points} pts</span>
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
