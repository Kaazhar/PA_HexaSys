import { useState } from 'react';
import { Package, MapPin, CheckCircle, ChevronRight, AlertCircle } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useQuery, useMutation } from '@tanstack/react-query';
import { containerService } from '../../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import clsx from 'clsx';
import { particulierSidebar } from '../../config/sidebars';
import type { ContainerSlot } from '../../types';

const SIZE_OPTIONS = [
  { value: 'S', label: 'Petit (S)', desc: '≤ 30×30×30 cm · max 5 kg', example: 'Livre, vêtement, gadget', color: '#3B82F6' },
  { value: 'M', label: 'Moyen (M)', desc: '≤ 60×40×40 cm · max 15 kg', example: 'Micro-onde, outil, chaussures', color: '#F59E0B' },
  { value: 'L', label: 'Grand (L)', desc: '≤ 100×60×60 cm · max 30 kg', example: 'TV, vélo pliant, meuble léger', color: '#EF4444' },
];

const STEP_LABELS = ['Objet', 'Conteneur', 'Case', 'Confirmation'];

export default function ContainerRequestPage() {
  const navigate = useNavigate();

  // ── Étape courante ──────────────────────────────────────────────────────
  const [step, setStep] = useState(0);

  // ── Étape 0 : infos objet ───────────────────────────────────────────────
  const [objectTitle, setObjectTitle] = useState('');
  const [objectDescription, setObjectDescription] = useState('');
  const [sizeCategory, setSizeCategory] = useState('');

  // ── Étape 1 : conteneur ─────────────────────────────────────────────────
  const [containerId, setContainerId] = useState<number | null>(null);

  // ── Étape 2 : case ──────────────────────────────────────────────────────
  const [slotId, setSlotId] = useState<number | null>(null);
  const [slotCode, setSlotCode] = useState('');

  // ── Étape 3 : date ──────────────────────────────────────────────────────
  const [desiredDate, setDesiredDate] = useState('');

  // ── Requêtes ────────────────────────────────────────────────────────────
  const containersQuery = useQuery({
    queryKey: ['containers'],
    queryFn: () => containerService.getAll(),
  });
  const containers = (containersQuery.data?.data ?? []).filter(c => c.status === 'operational');
  const selectedContainer = containers.find(c => c.id === containerId);

  const slotsQuery = useQuery({
    queryKey: ['container-slots', containerId],
    queryFn: () => containerService.getSlots(containerId!),
    enabled: containerId !== null,
    retry: 1,
  });
  const allSlots: ContainerSlot[] = slotsQuery.data?.data ?? [];
  const sizeSlots = allSlots.filter(s => s.size === sizeCategory);
  const freeCount = sizeSlots.filter(s => s.status === 'free').length;

  const createMutation = useMutation({
    mutationFn: () =>
      containerService.createRequest({
        container_id: containerId!,
        object_title: objectTitle.trim(),
        object_description: objectDescription.trim(),
        desired_date: desiredDate,
        size_category: sizeCategory,
        slot_id: slotId!,
      }),
    onSuccess: () => {
      toast.success("Demande envoyée ! Vous recevrez votre code d'accès après validation.");
      navigate('/mes-depots');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Erreur lors de l'envoi");
    },
  });

  // ── Date limits ─────────────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 3);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  // ── Navigation ──────────────────────────────────────────────────────────
  const goNext = () => {
    if (step === 0) {
      if (!objectTitle.trim()) { toast.error('Le nom de l\'objet est requis'); return; }
      if (!sizeCategory) { toast.error('La taille du colis est requise'); return; }
      setStep(1);
    } else if (step === 1) {
      if (!containerId) { toast.error('Veuillez sélectionner un conteneur'); return; }
      setSlotId(null);
      setSlotCode('');
      setStep(2);
    } else if (step === 2) {
      if (!slotId) { toast.error('Veuillez sélectionner une case'); return; }
      setStep(3);
    }
  };

  const goBack = () => {
    setStep(s => Math.max(0, s - 1));
  };

  const handleSubmit = () => {
    if (!desiredDate) { toast.error('La date de dépôt est requise'); return; }
    if (!containerId || !slotId) { toast.error('Données manquantes, veuillez recommencer'); return; }
    createMutation.mutate();
  };

  // ── Rendu ────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout sidebarItems={particulierSidebar} title="Demande de dépôt en conteneur">
      <div className="max-w-2xl mx-auto">

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-8">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all',
                i < step ? 'bg-green-500 text-white' : i === step ? 'bg-[#2D5016] text-white' : 'bg-gray-200 text-gray-500'
              )}>
                {i < step ? <CheckCircle className="w-5 h-5" /> : i + 1}
              </div>
              <span className={clsx('text-sm font-medium hidden sm:block whitespace-nowrap',
                i === step ? 'text-[#2D5016]' : i < step ? 'text-green-600' : 'text-gray-400'
              )}>
                {label}
              </span>
              {i < STEP_LABELS.length - 1 && (
                <div className={clsx('h-0.5 flex-1', i < step ? 'bg-green-400' : 'bg-gray-200')} />
              )}
            </div>
          ))}
        </div>

        <div className="card">

          {/* ── Étape 0 : Infos objet ──────────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-gray-900">Décrivez votre objet</h2>

              <div>
                <label className="label">Nom de l'objet *</label>
                <input
                  type="text"
                  value={objectTitle}
                  onChange={e => setObjectTitle(e.target.value)}
                  className="input"
                  placeholder="Ex: Chaise en bois"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="label">Description <span className="text-gray-400 font-normal">(optionnel)</span></label>
                <textarea
                  value={objectDescription}
                  onChange={e => setObjectDescription(e.target.value)}
                  className="input min-h-[80px] resize-none"
                  placeholder="État, matériaux, particularités..."
                  maxLength={500}
                />
              </div>

              <div>
                <label className="label">Taille du colis *</label>
                <p className="text-xs text-gray-400 mb-3">Détermine quelle case vous sera réservée dans le conteneur.</p>
                <div className="space-y-2">
                  {SIZE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSizeCategory(opt.value)}
                      className={clsx(
                        'w-full flex items-center gap-4 p-4 border-2 rounded-xl transition-all text-left',
                        sizeCategory === opt.value ? 'border-[#2D5016] bg-green-50' : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                        style={{ backgroundColor: opt.color }}
                      >
                        {opt.value}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm">{opt.label}</p>
                        <p className="text-xs text-gray-500">{opt.desc}</p>
                        <p className="text-xs text-gray-400 italic">{opt.example}</p>
                      </div>
                      {sizeCategory === opt.value && <CheckCircle className="w-5 h-5 text-[#2D5016] flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Étape 1 : Choix conteneur ──────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Choisissez un conteneur</h2>
              <p className="text-sm text-gray-500">Sélectionnez un point de dépôt disponible près de chez vous.</p>

              {containersQuery.isLoading ? (
                <div className="flex justify-center py-8"><LoadingSpinner /></div>
              ) : containers.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Aucun conteneur disponible pour le moment.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {containers.map((c) => {
                    const fill = Math.round((c.current_count / c.capacity) * 100);
                    const isFull = c.current_count >= c.capacity;
                    const isSelected = containerId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        disabled={isFull}
                        onClick={() => setContainerId(c.id)}
                        className={clsx(
                          'w-full flex items-start gap-3 p-4 border-2 rounded-xl transition-all text-left',
                          isSelected ? 'border-[#2D5016] bg-green-50' : 'border-gray-200 hover:border-gray-300',
                          isFull && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <div className={clsx(
                          'w-5 h-5 rounded-full border-2 flex-shrink-0 mt-1 transition-all',
                          isSelected ? 'border-[#2D5016] bg-[#2D5016]' : 'border-gray-300 bg-white'
                        )} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-gray-900">{c.name}</p>
                            <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium',
                              isFull ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
                            )}>
                              {isFull ? 'Plein' : 'Disponible'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <MapPin className="w-3 h-3" />
                            <span>{c.address}, {c.district}</span>
                          </div>
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                              <span>Remplissage</span>
                              <span>{c.current_count}/{c.capacity}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div
                                className={clsx('h-1.5 rounded-full transition-all',
                                  fill >= 90 ? 'bg-red-500' : fill >= 70 ? 'bg-amber-500' : 'bg-[#2D5016]'
                                )}
                                style={{ width: `${Math.min(100, fill)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Étape 2 : Grille des cases ─────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Choisissez votre case</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Cases <strong>taille {sizeCategory}</strong> disponibles dans <strong>{selectedContainer?.name}</strong>
                </p>
              </div>

              {slotsQuery.isLoading ? (
                <div className="flex flex-col items-center py-12 gap-3">
                  <LoadingSpinner size="lg" />
                  <p className="text-sm text-gray-400">Chargement des cases...</p>
                </div>
              ) : slotsQuery.isError ? (
                <div className="text-center py-10">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-400" />
                  <p className="text-sm font-medium text-red-600">Impossible de charger les cases</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {(slotsQuery.error as any)?.message ?? 'Erreur réseau'}
                  </p>
                  <button
                    type="button"
                    onClick={() => slotsQuery.refetch()}
                    className="mt-3 text-sm text-[#2D5016] underline"
                  >
                    Réessayer
                  </button>
                </div>
              ) : allSlots.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium text-gray-600">Ce conteneur n'a pas encore de cases configurées</p>
                  <p className="text-xs text-gray-400 mt-1">Contactez l'administrateur.</p>
                  <button type="button" onClick={goBack} className="text-[#2D5016] text-sm mt-3 underline">
                    Choisir un autre conteneur
                  </button>
                </div>
              ) : sizeSlots.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium text-gray-600">Aucune case taille {sizeCategory} dans ce conteneur</p>
                  <button type="button" onClick={goBack} className="text-[#2D5016] text-sm mt-3 underline">
                    Choisir un autre conteneur
                  </button>
                </div>
              ) : (
                <>
                  {/* Compteur */}
                  <div className={clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium',
                    freeCount === 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800'
                  )}>
                    {freeCount === 0
                      ? <><AlertCircle className="w-4 h-4" /> Aucune case libre taille {sizeCategory} dans ce conteneur</>
                      : <><CheckCircle className="w-4 h-4" /> {freeCount} case{freeCount > 1 ? 's' : ''} libre{freeCount > 1 ? 's' : ''} sur {sizeSlots.length}</>
                    }
                  </div>

                  {/* Grille par taille */}
                  {['S', 'M', 'L'].map((size) => {
                    const group = allSlots.filter(s => s.size === size);
                    if (group.length === 0) return null;
                    const isActiveSize = size === sizeCategory;
                    return (
                      <div key={size} className={clsx(!isActiveSize && 'opacity-30 pointer-events-none select-none')}>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          Taille {size}{!isActiveSize ? ' — autre taille (non sélectionnable)' : ''}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {group.map((slot) => {
                            const isFree = slot.status === 'free';
                            const isChosen = slotId === slot.id;
                            return (
                              <button
                                key={slot.id}
                                type="button"
                                disabled={!isFree}
                                onClick={() => {
                                  setSlotId(slot.id);
                                  setSlotCode(slot.slot_code);
                                }}
                                className={clsx(
                                  'w-16 h-14 rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all',
                                  'text-xs font-mono font-bold',
                                  slot.status === 'reserved' && 'border-amber-200 bg-amber-50 text-amber-500 cursor-not-allowed',
                                  slot.status === 'occupied' && 'border-red-200 bg-red-50 text-red-400 cursor-not-allowed',
                                  isFree && !isChosen && 'border-gray-200 bg-white text-gray-700 hover:border-[#2D5016] hover:bg-green-50 cursor-pointer',
                                  isFree && isChosen && 'border-[#2D5016] bg-[#2D5016] text-white shadow-lg scale-110 cursor-pointer',
                                )}
                              >
                                <span>{slot.slot_code}</span>
                                {!isFree && (
                                  <span className="text-[9px] uppercase opacity-70 leading-none">
                                    {slot.status === 'reserved' ? 'Rés.' : 'Occ.'}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Légende */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 pt-3 border-t border-gray-100">
                    <span className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded border-2 border-gray-200 bg-white inline-block" />Libre
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded border-2 border-[#2D5016] bg-[#2D5016] inline-block" />Sélectionnée
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded border-2 border-amber-200 bg-amber-50 inline-block" />Réservée
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded border-2 border-red-200 bg-red-50 inline-block" />Occupée
                    </span>
                  </div>

                  {/* Case sélectionnée */}
                  {slotId && (
                    <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <p className="text-sm text-green-800">
                        Case <strong className="font-mono">{slotCode}</strong> sélectionnée
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Étape 3 : Date + récap ──────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-gray-900">Confirmation</h2>

              {/* Récap */}
              <div className="p-4 bg-gray-50 rounded-xl space-y-3 text-sm border border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Conteneur</span>
                  <span className="font-semibold text-gray-900">{selectedContainer?.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Case réservée</span>
                  <span className="font-mono font-bold text-[#2D5016] text-base">{slotCode}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Taille</span>
                  <span className="font-medium">
                    {SIZE_OPTIONS.find(s => s.value === sizeCategory)?.label}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Objet</span>
                  <span className="font-medium text-right max-w-[60%] truncate">{objectTitle}</span>
                </div>
                {objectDescription && (
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-gray-500 flex-shrink-0">Description</span>
                    <span className="text-gray-700 text-right text-xs">{objectDescription}</span>
                  </div>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="label">Date de dépôt souhaitée *</label>
                <input
                  type="date"
                  value={desiredDate}
                  onChange={e => setDesiredDate(e.target.value)}
                  min={today}
                  max={maxDateStr}
                  className="input"
                />
              </div>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-sm text-amber-800">
                  Votre demande sera vérifiée par notre équipe. Vous recevrez votre code d'accès et le détail de votre case par notification.
                </p>
              </div>
            </div>
          )}

          {/* ── Boutons navigation ──────────────────────────────────────── */}
          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-100">
            {step > 0 && (
              <button type="button" onClick={goBack} className="btn-secondary flex-1">
                Retour
              </button>
            )}
            {step < 3 ? (
              <button type="button" onClick={goNext} className="btn-primary flex-1 flex items-center justify-center gap-2">
                Suivant <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="btn-primary flex-1"
              >
                {createMutation.isPending ? 'Envoi en cours...' : 'Envoyer la demande'}
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
