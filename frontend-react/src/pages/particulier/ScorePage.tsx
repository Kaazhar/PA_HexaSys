import { Leaf, Droplets, Wind, CheckCircle } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { scoreService } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import clsx from 'clsx';
import { particulierSidebar } from '../../config/sidebars';
import { useTranslation } from 'react-i18next';

const levels = [
  { key: 'debutant', name: 'Débutant', min: 0, max: 99, color: 'bg-green-200' },
  { key: 'intermediaire', name: 'Intermédiaire', min: 100, max: 299, color: 'bg-green-400' },
  { key: 'avance', name: 'Avancé', min: 300, max: 699, color: 'bg-green-600' },
  { key: 'expert', name: 'Expert', min: 700, max: Infinity, color: 'bg-primary-600' },
];

export default function ScorePage() {
  const { t } = useTranslation();
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
          
          <div className="card text-center py-8">
            <div className={`w-10 h-10 rounded-full mx-auto mb-2 ${currentLevel.color}`} />
            <p className="text-sm text-gray-500 mb-1">{t('score.current_level')}</p>
            <h2 className="text-xl font-bold text-gray-900 mb-3">{score?.level || t(`score.levels.${currentLevel.key}`)}</h2>
            <div className="text-5xl font-black text-primary-600 mb-1">{score?.total_points || 0}</div>
            <p className="text-sm text-gray-500">{t('score.points_label')}</p>

            {nextLevel && (
              <div className="mt-5 max-w-xs mx-auto">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{t(`score.levels.${currentLevel.key}`)}</span>
                  <span>{t(`score.levels.${nextLevel.key}`)} {t('score.next_at', { count: nextLevel.min })}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-primary-500 rounded-full h-2" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">{t('score.remaining', { count: nextLevel.min - (score?.total_points || 0) })}</p>
              </div>
            )}
          </div>

          
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">{t('score.env_impact')}</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <Leaf className="w-6 h-6 text-green-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-gray-900">{score?.waste_avoided_kg || 0} kg</p>
                <p className="text-xs text-gray-500">{t('score.wasteAvoided')}</p>
              </div>
              <div>
                <Wind className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-gray-900">{score?.co2_saved_kg || 0} kg</p>
                <p className="text-xs text-gray-500">{t('score.co2Saved')}</p>
              </div>
              <div>
                <Droplets className="w-6 h-6 text-cyan-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-gray-900">{score?.water_saved_liters || 0} L</p>
                <p className="text-xs text-gray-500">{t('score.waterSaved')}</p>
              </div>
            </div>
          </div>

          
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">{t('score.levels_title')}</h2>
            <div className="divide-y divide-gray-100">
              {levels.map((level) => {
                const isActive = currentLevel.key === level.key;
                const isDone = (score?.total_points || 0) > level.max;
                return (
                  <div key={level.name} className={clsx('flex items-center gap-3 py-3', isActive && 'font-semibold text-primary-700')}>
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${level.color}`} />
                    <span className="flex-1 text-sm">{t(`score.levels.${level.key}`)}</span>
                    <span className="text-xs text-gray-400">{level.min} — {level.max === Infinity ? '∞' : level.max} pts</span>
                    {isActive && <span className="badge-green text-xs">{t('score.current_badge')}</span>}
                    {isDone && <CheckCircle className="w-3.5 h-3.5 text-gray-400" />}
                  </div>
                );
              })}
            </div>
          </div>

          
          {entries.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">{t('score.history_title')}</h2>
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
