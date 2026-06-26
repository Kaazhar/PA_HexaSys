import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import type { UserRole } from '../types';
import { useTranslation } from 'react-i18next';

interface Step {
  route?: string;
  target?: string;
  title: string;
  description: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

interface SpotRect { top: number; left: number; width: number; height: number; }

const PADDING = 8;
const TOOLTIP_W = 300;
const GAP = 14;

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

const stepsByRole: Record<UserRole, Step[]> = {
  particulier: [
    {
      title: 'Bienvenue sur UpcycleConnect !',
      description: 'En quelques étapes, on va vous faire découvrir toutes les fonctionnalités de votre espace personnel.',
    },
    {
      route: '/dashboard',
      title: 'Votre tableau de bord',
      description: "Vue globale de votre activité : dernières annonces, prochains ateliers et raccourcis rapides.",
    },
    {
      target: 'tour-stats',
      title: 'Vos statistiques',
      description: "Annonces actives, ateliers suivis et score upcycling d'un coup d'oeil.",
      placement: 'bottom',
    },
    {
      route: '/mes-annonces',
      title: 'Vos annonces',
      description: "Retrouvez toutes vos annonces publiées (dons ou ventes), leur statut de modération et les messages reçus.",
    },
    {
      route: '/annonces/creer',
      title: 'Créer une annonce',
      description: "Proposez un objet en don ou à la vente. Ajoutez des photos, une description et localisez-le sur la carte. Chaque annonce est vérifiée avant publication.",
    },
    {
      route: '/conteneurs',
      title: 'Les conteneurs',
      description: "Carte interactive de nos points de dépôt à Paris. Cliquez sur un conteneur pour faire une demande et recevoir votre code d'accès.",
    },
    {
      route: '/score',
      title: 'Votre score upcycling',
      description: "Chaque action sur la plateforme vous rapporte des points. Suivez votre niveau, vos badges et mesurez votre impact environnemental.",
    },
    {
      route: '/messages',
      title: 'La messagerie',
      description: "Contactez les vendeurs directement depuis leurs annonces. Toutes vos conversations sont centralisées ici.",
    },
    {
      route: '/dashboard',
      target: 'tour-notifications',
      title: 'Notifications en temps réel',
      description: "Validations d'annonces, nouveaux messages, ateliers à venir… tout apparaît ici. Activez aussi les notifications push !",
      placement: 'bottom',
    },
  ],
  professionnel: [
    {
      title: 'Bienvenue sur votre espace Pro !',
      description: "Accédez aux matériaux à recycler, gérez vos projets et développez votre activité grâce à UpcycleConnect.",
    },
    {
      route: '/pro',
      title: 'Tableau de bord Pro',
      description: "Vue d'ensemble de votre activité : annonces disponibles, projets en cours et indicateurs clés.",
    },
    {
      route: '/mes-annonces',
      title: 'Annonces disponibles',
      description: "Parcourez les dépôts de particuliers et achetez directement les matériaux dont vous avez besoin.",
    },
    {
      route: '/annonces/creer',
      title: 'Créer une annonce',
      description: "Mettez en vente vos créations ou proposez des services. Gérez votre catalogue depuis ici.",
    },
    {
      route: '/pro/projets',
      title: 'Projets upcycling',
      description: "Documentez et partagez vos transformations. Mettez en avant votre savoir-faire pour attirer de nouveaux clients.",
    },
    {
      route: '/abonnement',
      title: 'Abonnement premium',
      description: "Passez au Pro pour débloquer les tableaux de bord avancés, les statistiques détaillées et les alertes prioritaires.",
    },
    {
      route: '/messages',
      title: 'Messagerie',
      description: "Contactez les particuliers, négociez les achats et gérez tous vos échanges professionnels.",
    },
    {
      route: '/pro',
      target: 'tour-notifications',
      title: 'Notifications',
      description: "Alertes pour les nouveaux dépôts dans les conteneurs, messages entrants et mises à jour.",
      placement: 'bottom',
    },
  ],
  salarie: [
    {
      title: 'Bienvenue animateur !',
      description: "Créez et gérez les formations, articles et événements de la communauté UpcycleConnect.",
    },
    {
      route: '/salarie',
      title: 'Tableau de bord',
      description: "Vue d'ensemble de vos activités : formations planifiées, articles publiés et agenda d'interventions.",
    },
    {
      route: '/salarie/formations',
      title: 'Formations',
      description: "Créez des ateliers, formations et conférences. Chaque événement est soumis à validation par un responsable avant publication.",
    },
    {
      route: '/salarie/articles',
      title: 'Articles',
      description: "Publiez des conseils, tutoriels et actualités. Sensibilisez la communauté aux bonnes pratiques de l'upcycling.",
    },
    {
      route: '/salarie/planning',
      title: 'Planning',
      description: "Consultez et organisez votre agenda d'interventions. Gardez une vue claire de toutes vos missions.",
    },
    {
      route: '/salarie',
      target: 'tour-notifications',
      title: 'Notifications',
      description: "Validations de formations, nouveaux inscrits et messages de la plateforme en temps réel.",
      placement: 'bottom',
    },
  ],
  admin: [
    {
      title: 'Bienvenue sur le Back-Office !',
      description: "Accès complet à la gestion de la plateforme UpcycleConnect. Voici un tour rapide des fonctionnalités clés.",
    },
    {
      route: '/admin',
      title: 'Dashboard Admin',
      description: "Vue globale : utilisateurs actifs, annonces en attente de modération, revenus et activité récente.",
    },
    {
      route: '/admin/utilisateurs',
      title: 'Gestion des utilisateurs',
      description: "Consultez, modifiez ou supprimez les comptes. Gérez les rôles et bannissez les utilisateurs problématiques.",
    },
    {
      route: '/admin/annonces',
      title: 'Modération des annonces',
      description: "Validez ou rejetez les annonces soumises par les particuliers et professionnels avant leur mise en ligne.",
    },
    {
      route: '/admin/conteneurs',
      title: 'Gestion des conteneurs',
      description: "Ajoutez des conteneurs, suivez leur taux de remplissage et validez les demandes de dépôt.",
    },
    {
      route: '/admin/finance',
      title: 'Suivi financier',
      description: "Revenus, abonnements actifs et factures générées. Vue complète de l'activité économique de la plateforme.",
    },
    {
      route: '/admin/signalements',
      title: 'Signalements',
      description: "Traitez les contenus signalés par la communauté. Gérez les abus et protégez la plateforme.",
    },
    {
      route: '/admin/newsletter',
      title: 'Newsletter',
      description: "Envoyez des newsletters ciblées à vos abonnés directement depuis le back-office.",
    },
    {
      route: '/admin',
      target: 'tour-notifications',
      title: 'Notifications',
      description: "Toutes les activités de la plateforme remontées en temps réel.",
      placement: 'bottom',
    },
  ],
};

interface TutorialOverlayProps {
  role: UserRole;
  onClose: () => void;
}

export default function TutorialOverlay({ role, onClose }: TutorialOverlayProps) {
  const { t } = useTranslation();
  const steps = stepsByRole[role] ?? stepsByRole.particulier;
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [spotRect, setSpotRect] = useState<SpotRect | null>(null);
  const [spotReady, setSpotReady] = useState(false);
  const step = steps[current];
  const isLast = current === steps.length - 1;

  useEffect(() => {
    let cancelled = false;
    setSpotReady(false);
    setSpotRect(null);

    const run = async () => {
      if (step.route) {
        navigate(step.route);
        await sleep(700);
      }
      if (cancelled) return;

      if (!step.target) {
        setSpotReady(true);
        return;
      }

      const el = document.getElementById(step.target);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        await sleep(300);
      }
      if (cancelled) return;

      const el2 = document.getElementById(step.target);
      if (el2) {
        const r = el2.getBoundingClientRect();
        setSpotRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      }
      setSpotReady(true);
    };

    run();
    return () => { cancelled = true; };
  }, [current]);

  const next = () => isLast ? onClose() : setCurrent(c => c + 1);
  const prev = () => setCurrent(c => c - 1);

  const progress = ((current + 1) / steps.length) * 100;

  const DotsRow = ({ compact }: { compact: boolean }) => (
    <div className="flex justify-center gap-1.5 pb-3">
      {steps.map((_, i) => (
        <button
          key={i}
          onClick={() => setCurrent(i)}
          className="rounded-full transition-all duration-300"
          style={{
            width: i === current ? (compact ? '14px' : '20px') : (compact ? '5px' : '8px'),
            height: compact ? '5px' : '8px',
            backgroundColor: i === current ? '#2D5016' : '#d1d5db',
          }}
        />
      ))}
    </div>
  );

  const NavRow = ({ compact }: { compact: boolean }) => (
    <div className={`flex gap-2 ${compact ? 'px-4 pb-4' : 'px-8 pb-8'}`}>
      {current > 0 ? (
        <button
          onClick={prev}
          className={`flex items-center gap-1 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-gray-600 ${compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm'}`}
        >
          <ChevronLeft size={compact ? 13 : 16} /> {compact ? t('tutorial.prev_short') : t('tutorial.prev')}
        </button>
      ) : (
        <button onClick={onClose} className={`text-gray-400 hover:text-gray-600 transition-colors ${compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm'}`}>
          {t('tutorial.skip')}
        </button>
      )}
      <button
        onClick={next}
        className={`flex-1 flex items-center justify-center gap-1 font-semibold text-white rounded-xl transition-colors ${compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm'}`}
        style={{ backgroundColor: '#2D5016' }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#3d6b1e')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#2D5016')}
      >
        {isLast ? t('tutorial.finish') : <>{t('tutorial.next')} <ChevronRight size={compact ? 13 : 16} /></>}
      </button>
    </div>
  );

  if (!spotReady) {
    return <div className="fixed inset-0 z-50" style={{ backgroundColor: 'rgba(0,0,0,0.65)' }} />;
  }

  if (step.target && spotRect) {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const p = PADDING;
    const { top, left, width, height } = spotRect;

    const svgPath = [
      `M0 0 L${W} 0 L${W} ${H} L0 ${H} Z`,
      `M${left - p} ${top - p} L${left - p} ${top + height + p} L${left + width + p} ${top + height + p} L${left + width + p} ${top - p} Z`,
    ].join(' ');

    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
    const placement = step.placement ?? 'bottom';
    const tooltipStyle: React.CSSProperties = (() => {
      switch (placement) {
        case 'right':
          return { top: clamp(top + height / 2, 16, H - 220), left: left + width + p + GAP, transform: 'translateY(-50%)', width: TOOLTIP_W };
        case 'left':
          return { top: clamp(top + height / 2, 16, H - 220), left: left - p - GAP - TOOLTIP_W, transform: 'translateY(-50%)', width: TOOLTIP_W };
        case 'top':
          return { top: top - p - GAP - 200, left: clamp(left + width / 2 - TOOLTIP_W / 2, 16, W - TOOLTIP_W - 16), width: TOOLTIP_W };
        case 'bottom':
        default:
          return { top: top + height + p + GAP, left: clamp(left + width / 2 - TOOLTIP_W / 2, 16, W - TOOLTIP_W - 16), width: TOOLTIP_W };
      }
    })();

    return (
      <>
        
        <svg style={{ position: 'fixed', top: 0, left: 0, zIndex: 40, pointerEvents: 'none' }} width={W} height={H}>
          <path d={svgPath} fill="rgba(0,0,0,0.7)" fillRule="evenodd" style={{ pointerEvents: 'all' }} />
        </svg>

        
        <div
          style={{
            position: 'fixed',
            top: top - p, left: left - p,
            width: width + p * 2, height: height + p * 2,
            zIndex: 41, borderRadius: 8, pointerEvents: 'none',
            boxShadow: '0 0 0 2px #4a7c28, 0 0 20px rgba(74,124,40,0.5)',
          }}
        />

        
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ ...tooltipStyle, position: 'fixed', zIndex: 50 }}>
          <div className="px-4 pt-4 pb-3" style={{ background: 'linear-gradient(135deg, #2D5016 0%, #4a7c28 100%)' }}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white leading-snug">{step.title}</h3>
              </div>
              <button onClick={onClose} className="text-white/60 hover:text-white transition-colors flex-shrink-0 mt-0.5">
                <X size={14} />
              </button>
            </div>
            <p className="text-white/55 text-xs mt-1.5">{current + 1} / {steps.length}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-gray-600 text-xs leading-relaxed">{step.description}</p>
          </div>
          <DotsRow compact={true} />
          <NavRow compact={true} />
        </div>
      </>
    );
  }

  if (step.route) {
    return (
      <>
        
        <div className="fixed inset-0 z-40" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} />

        
        <div
          className="fixed z-50 bg-white rounded-2xl shadow-2xl overflow-hidden"
          style={{ bottom: 32, left: '50%', transform: 'translateX(-50%)', width: 460 }}
        >
          
          <div className="px-6 pt-5 pb-4" style={{ background: 'linear-gradient(135deg, #2D5016 0%, #4a7c28 100%)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="text-base font-bold text-white">{step.title}</h3>
                  <p className="text-white/55 text-xs mt-0.5">{t('tutorial.step_counter', { current: current + 1, total: steps.length })}</p>
                </div>
              </div>
              <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          
          <div className="h-1 bg-gray-100">
            <div className="h-1 transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: '#2D5016' }} />
          </div>

          
          <div className="px-6 py-4">
            <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
          </div>

          <DotsRow compact={false} />
          <NavRow compact={false} />
        </div>
      </>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="relative px-8 pt-8 pb-6 text-center" style={{ background: 'linear-gradient(135deg, #2D5016 0%, #4a7c28 100%)' }}>
          <button onClick={onClose} className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors">
            <X size={20} />
          </button>
          <h2 className="text-xl font-bold text-white">{step.title}</h2>
          <p className="text-white/60 text-sm mt-1">{current + 1} / {steps.length}</p>
        </div>
        <div className="px-8 py-6">
          <p className="text-gray-600 text-sm leading-relaxed text-center">{step.description}</p>
        </div>
        <div className="px-8 mb-1">
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: '#2D5016' }} />
          </div>
        </div>
        <DotsRow compact={false} />
        <NavRow compact={false} />
      </div>
    </div>
  );
}
