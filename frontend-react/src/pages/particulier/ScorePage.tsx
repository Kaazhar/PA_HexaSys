import { Leaf, Droplets, Wind } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { scoreService } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import clsx from 'clsx';
import { particulierSidebar } from '../../config/sidebars';

const levels = [
  { name: 'Débutant', min: 0, max: 99, emoji: '🌱' },
  { name: 'Intermédiaire', min: 100, max: 299, emoji: '🌿' },
  { name: 'Avancé', min: 300, max: 699, emoji: '🌳' },
  { name: 'Expert', min: 700, max: Infinity, emoji: '🏆' },
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

  return (
    <DashboardLayout sidebarItems={particulierSidebar} title="Mon score upcycling">
      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="space-y-6 max-w-3xl">
          {/* Score card */}
          <div className="card text-center py-8">
            <div className="text-4xl mb-2">{currentLevel.emoji}</div>
            <p className="text-sm text-gray-500 mb-1">Niveau actuel</p>
            <h2 className="text-xl font-bold text-gray-900 mb-3">{score?.level || currentLevel.name}</h2>
            <div className="text-5xl font-black text-primary-600 mb-1">{score?.total_points || 0}</div>
            <p className="text-sm text-gray-500">points upcycling</p>

            {nextLevel && (
              <div className="mt-5 max-w-xs mx-auto">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{currentLevel.name}</span>
                  <span>{nextLevel.name} à {nextLevel.min} pts</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-primary-500 rounded-full h-2" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">Plus que {nextLevel.min - (score?.total_points || 0)} points</p>
              </div>
            )}
          </div>

          {/* Impact environnemental */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Impact environnemental</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <Leaf className="w-6 h-6 text-green-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-gray-900">{score?.waste_avoided_kg || 0} kg</p>
                <p className="text-xs text-gray-500">Déchets évités</p>
              </div>
              <div>
                <Wind className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-gray-900">{score?.co2_saved_kg || 0} kg</p>
                <p className="text-xs text-gray-500">CO₂ économisé</p>
              </div>
              <div>
                <Droplets className="w-6 h-6 text-cyan-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-gray-900">{score?.water_saved_liters || 0} L</p>
                <p className="text-xs text-gray-500">Eau économisée</p>
              </div>
            </div>
          </div>

          {/* Niveaux */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Niveaux</h2>
            <div className="divide-y divide-gray-100">
              {levels.map((level) => {
                const isActive = currentLevel.name === level.name;
                const isDone = (score?.total_points || 0) > level.max;
                return (
                  <div key={level.name} className={clsx('flex items-center gap-3 py-3', isActive && 'font-semibold text-primary-700')}>
                    <span>{level.emoji}</span>
                    <span className="flex-1 text-sm">{level.name}</span>
                    <span className="text-xs text-gray-400">{level.min} — {level.max === Infinity ? '∞' : level.max} pts</span>
                    {isActive && <span className="badge-green text-xs">Actuel</span>}
                    {isDone && <span className="text-xs text-gray-400">✓</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Historique */}
          {entries.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">Historique des actions</h2>
              <ul className="divide-y divide-gray-100">
                {entries.map((entry: { id: number; reason: string; points: number; created_at: string }) => (
                  <li key={entry.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm text-gray-800">{entry.reason}</p>
                      <p className="text-xs text-gray-400">{entry.created_at ? format(new Date(entry.created_at), 'dd MMM yyyy', { locale: fr }) : ''}</p>
                    </div>
                    <span className="font-semibold text-primary-600 text-sm">+{entry.points} pts</span>
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
