import { useState } from 'react';
import { CheckCircle, Upload, X, MapPin, Package, SkipForward } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useQuery, useMutation } from '@tanstack/react-query';
import { categoryService, listingService, uploadService, containerService } from '../../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { particulierSidebar, proSidebar } from '../../config/sidebars';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import type { ContainerSlot } from '../../types';

const SIZE_OPTIONS = [
  { value: 'S', label: 'S — Petit', desc: '≤ 30×30×30 cm · ≤ 5 kg', example: 'Livre, vêtement, gadget' },
  { value: 'M', label: 'M — Moyen', desc: '≤ 60×40×40 cm · ≤ 15 kg', example: 'Micro-onde, chaussures, outil' },
  { value: 'L', label: 'L — Grand', desc: '≤ 100×60×60 cm · ≤ 30 kg', example: 'TV, vélo pliant, meuble léger' },
];

const CONDITION_LABELS: Record<string, string> = {
  neuf: 'Neuf', bon_etat: 'Bon état', use: 'Usé', pieces: 'Pour pièces',
};

const STEPS = ['Type & Catégorie', 'Détails', 'Conteneur', 'Récapitulatif'];

export default function CreateListingPage() {
  const { user } = useAuth();
  const sidebar = user?.role === 'professionnel' ? proSidebar : particulierSidebar;
  const navigate = useNavigate();

  // ── Étape ────────────────────────────────────────────────────────────────
  const [step, setStep] = useState(0);

  // ── Étape 0 ──────────────────────────────────────────────────────────────
  const [type, setType] = useState<'don' | 'vente'>('don');
  const [categoryId, setCategoryId] = useState<number | null>(null);

  // ── Étape 1 ──────────────────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('bon_etat');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [weight, setWeight] = useState('');
  const [sizeCategory, setSizeCategory] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // ── Étape 2 : Conteneur (optionnel) ──────────────────────────────────────
  const [containerId, setContainerId] = useState<number | null>(null);
  const [slotId, setSlotId] = useState<number | null>(null);
  const [slotCode, setSlotCode] = useState('');
  const [skipContainer, setSkipContainer] = useState(false);

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getAll(),
  });
  const categories = categoriesData?.data ?? [];
  const selectedCategory = categories.find(c => c.id === categoryId);

  const containersQuery = useQuery({
    queryKey: ['containers'],
    queryFn: () => containerService.getAll(),
    enabled: step === 2,
  });
  const containers = (containersQuery.data?.data ?? []).filter(c => c.status === 'operational');
  const selectedContainer = containers.find(c => c.id === containerId);

  const slotsQuery = useQuery({
    queryKey: ['container-slots', containerId],
    queryFn: () => containerService.getSlots(containerId!),
    enabled: containerId !== null && step === 2,
    retry: 1,
  });
  const allSlots: ContainerSlot[] = slotsQuery.data?.data ?? [];
  const sizeSlots = allSlots.filter(s => s.size === sizeCategory);
  const freeCount = sizeSlots.filter(s => s.status === 'free').length;

  // ── Upload image ──────────────────────────────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const res = await uploadService.upload(file);
        setImages(prev => [...prev, res.data.url]);
      }
    } catch {
      toast.error("Erreur lors du chargement de l'image");
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // ── Mutation listing ──────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async () => {
      const listingRes = await listingService.create({
        title: title.trim(),
        description: description.trim(),
        type,
        category_id: categoryId!,
        condition,
        price: type === 'vente' ? parseFloat(price) || 0 : undefined,
        location: location.trim(),
        weight: weight ? parseFloat(weight) : undefined,
        size_category: sizeCategory || undefined,
        images: images.join(','),
      } as any);

      // Si un slot a été choisi, créer la demande de dépôt automatiquement
      if (!skipContainer && containerId && slotId) {
        const today = new Date();
        today.setDate(today.getDate() + 7);
        const desiredDate = today.toISOString().split('T')[0];
        await containerService.createRequest({
          container_id: containerId,
          object_title: title.trim(),
          object_description: description.trim(),
          desired_date: desiredDate,
          size_category: sizeCategory,
          slot_id: slotId,
        });
      }

      return listingRes;
    },
    onSuccess: () => {
      if (!skipContainer && containerId && slotId) {
        toast.success(`Annonce créée et case ${slotCode} réservée ! En attente de validation.`);
      } else {
        toast.success('Annonce créée ! Elle est en attente de modération.');
      }
      navigate('/dashboard');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Erreur lors de la création');
    },
  });

  // ── Navigation ────────────────────────────────────────────────────────────
  const goNext = () => {
    if (step === 0) {
      if (!categoryId) { toast.error('Veuillez sélectionner une catégorie'); return; }
      setStep(1);
    } else if (step === 1) {
      if (!title.trim() || title.trim().length < 5) { toast.error('Le titre doit faire au moins 5 caractères'); return; }
      if (!location.trim()) { toast.error('La localisation est requise'); return; }
      if (!sizeCategory) { toast.error('La taille du colis est requise'); return; }
      // Réinitialiser le choix de case si la taille a changé
      setSlotId(null);
      setSlotCode('');
      setStep(2);
    } else if (step === 2) {
      // L'étape conteneur est optionnelle
      if (!skipContainer && containerId && !slotId) {
        toast.error('Veuillez sélectionner une case ou passer cette étape');
        return;
      }
      setStep(3);
    }
  };

  const goBack = () => setStep(s => Math.max(0, s - 1));

  const handleSubmit = () => {
    if (!categoryId || !title.trim() || !location.trim() || !sizeCategory) {
      toast.error('Données manquantes, veuillez vérifier');
      return;
    }
    createMutation.mutate();
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout sidebarItems={sidebar} title="Créer une annonce">
      <div className="max-w-2xl mx-auto">

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all',
                i < step ? 'bg-green-500 text-white' : i === step ? 'bg-[#2D5016] text-white' : 'bg-gray-200 text-gray-500'
              )}>
                {i < step ? <CheckCircle className="w-5 h-5" /> : i + 1}
              </div>
              <span className={clsx('text-xs font-medium hidden sm:block whitespace-nowrap',
                i === step ? 'text-[#2D5016]' : i < step ? 'text-green-600' : 'text-gray-400'
              )}>
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={clsx('h-0.5 flex-1', i < step ? 'bg-green-400' : 'bg-gray-200')} />
              )}
            </div>
          ))}
        </div>

        <div className="card">

          {/* ── Étape 0 : Type & Catégorie ───────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Type d'annonce</h2>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { value: 'don' as const, label: 'Don', desc: 'Je donne gratuitement', icon: '🎁', sel: 'border-green-500 bg-green-50' },
                    { value: 'vente' as const, label: 'Vente', desc: 'Je vends avec un prix', icon: '💰', sel: 'border-orange-400 bg-orange-50' },
                  ].map((opt) => (
                    <button key={opt.value} type="button" onClick={() => setType(opt.value)}
                      className={clsx('flex flex-col items-center gap-2 p-5 border-2 rounded-xl transition-all',
                        type === opt.value ? opt.sel : 'border-gray-200 hover:border-gray-300')}>
                      <span className="text-3xl">{opt.icon}</span>
                      <span className="font-bold text-gray-900">{opt.label}</span>
                      <span className="text-xs text-gray-500">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Catégorie</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {categories.map((cat) => (
                    <button key={cat.id} type="button" onClick={() => setCategoryId(cat.id)}
                      className={clsx('flex items-center gap-2 p-3 border-2 rounded-xl transition-all text-left',
                        categoryId === cat.id ? 'border-[#2D5016] bg-green-50' : 'border-gray-200 hover:border-gray-300')}>
                      {cat.icon && <span className="text-lg">{cat.icon}</span>}
                      <span className="text-sm font-medium text-gray-700 flex-1">{cat.name}</span>
                      {categoryId === cat.id && <CheckCircle className="w-4 h-4 text-[#2D5016] flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Étape 1 : Détails ────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-gray-900">Détails de l'annonce</h2>

              <div>
                <label className="label">Titre *</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  className="input" placeholder="Ex: Table basse en bois massif" />
              </div>

              <div>
                <label className="label">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  className="input min-h-[100px] resize-none"
                  placeholder="Décrivez votre objet (état, dimensions, particularités...)" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">État</label>
                  <select value={condition} onChange={e => setCondition(e.target.value)} className="input">
                    <option value="neuf">Neuf</option>
                    <option value="bon_etat">Bon état</option>
                    <option value="use">Usé</option>
                    <option value="pieces">Pour pièces</option>
                  </select>
                </div>
                {type === 'vente' && (
                  <div>
                    <label className="label">Prix (€)</label>
                    <input type="number" value={price} onChange={e => setPrice(e.target.value)}
                      step="0.01" min="0" className="input" placeholder="0.00" />
                  </div>
                )}
              </div>

              <div>
                <label className="label">Localisation *</label>
                <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                  className="input" placeholder="Ex: Paris 11e" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Poids estimé (kg)</label>
                  <input type="number" value={weight} onChange={e => setWeight(e.target.value)}
                    step="0.1" min="0" className="input" placeholder="Ex: 2.5" />
                </div>
              </div>

              <div>
                <label className="label">Taille du colis *</label>
                <p className="text-xs text-gray-400 mb-3">Détermine quelle case peut vous être réservée dans un conteneur.</p>
                <div className="space-y-2">
                  {SIZE_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button" onClick={() => setSizeCategory(opt.value)}
                      className={clsx('w-full flex items-start gap-3 p-3 border-2 rounded-xl transition-all text-left',
                        sizeCategory === opt.value ? 'border-[#2D5016] bg-green-50' : 'border-gray-200 hover:border-gray-300')}>
                      <div className={clsx('w-5 h-5 rounded-full border-2 mt-0.5 flex-shrink-0 transition-all',
                        sizeCategory === opt.value ? 'border-[#2D5016] bg-[#2D5016]' : 'border-gray-300 bg-white')} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">{opt.value}</span>
                          <span className="text-sm font-medium text-gray-900">{opt.label}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                        <p className="text-xs text-gray-400 italic">{opt.example}</p>
                      </div>
                      {sizeCategory === opt.value && <CheckCircle className="w-5 h-5 text-[#2D5016] flex-shrink-0 mt-0.5" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Photos */}
              <div>
                <label className="label">Photos <span className="text-gray-400 font-normal">(optionnel)</span></label>
                <div className="space-y-3">
                  {images.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {images.map((url) => (
                        <div key={url} className="relative group">
                          <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
                          <button type="button" onClick={() => setImages(prev => prev.filter(u => u !== url))}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className={clsx('flex items-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors text-sm',
                    uploading ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed' : 'border-gray-300 hover:border-[#2D5016] hover:bg-green-50 text-gray-500')}>
                    {uploading ? <LoadingSpinner size="sm" /> : <Upload className="w-4 h-4" />}
                    {uploading ? 'Chargement...' : 'Ajouter des photos'}
                    <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="sr-only" disabled={uploading} />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ── Étape 2 : Conteneur & Case ───────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Réserver une case conteneur</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Facultatif — choisissez où déposer votre objet ({sizeCategory && <strong>taille {sizeCategory}</strong>}).
                </p>
              </div>

              {/* Bouton passer */}
              <button type="button" onClick={() => { setSkipContainer(true); setContainerId(null); setSlotId(null); setSlotCode(''); setStep(3); }}
                className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-all">
                <SkipForward className="w-4 h-4" />
                Passer cette étape (pas de dépôt en conteneur)
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
                <div className="relative flex justify-center text-xs text-gray-400"><span className="bg-white px-3">ou choisissez un conteneur</span></div>
              </div>

              {/* Liste des conteneurs */}
              {containersQuery.isLoading ? (
                <div className="flex justify-center py-6"><LoadingSpinner /></div>
              ) : (
                <div className="space-y-3">
                  {containers.map((c) => {
                    const fill = Math.round((c.current_count / c.capacity) * 100);
                    const isFull = c.current_count >= c.capacity;
                    const isSelected = containerId === c.id;
                    return (
                      <button key={c.id} type="button" disabled={isFull}
                        onClick={() => { setContainerId(c.id); setSlotId(null); setSlotCode(''); setSkipContainer(false); }}
                        className={clsx('w-full flex items-start gap-3 p-4 border-2 rounded-xl transition-all text-left',
                          isSelected ? 'border-[#2D5016] bg-green-50' : 'border-gray-200 hover:border-gray-300',
                          isFull && 'opacity-50 cursor-not-allowed')}>
                        <div className={clsx('w-5 h-5 rounded-full border-2 flex-shrink-0 mt-1',
                          isSelected ? 'border-[#2D5016] bg-[#2D5016]' : 'border-gray-300 bg-white')} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-gray-900">{c.name}</p>
                            <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium',
                              isFull ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700')}>
                              {isFull ? 'Plein' : 'Disponible'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <MapPin className="w-3 h-3" /><span>{c.address}, {c.district}</span>
                          </div>
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                              <span>Remplissage</span><span>{c.current_count}/{c.capacity}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div className={clsx('h-1.5 rounded-full', fill >= 90 ? 'bg-red-500' : fill >= 70 ? 'bg-amber-500' : 'bg-[#2D5016]')}
                                style={{ width: `${Math.min(100, fill)}%` }} />
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Grille de cases */}
              {containerId && (
                <div className="space-y-4 pt-2 border-t border-gray-100">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Cases disponibles — {selectedContainer?.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Sélectionnez une case taille {sizeCategory}</p>
                  </div>

                  {slotsQuery.isLoading ? (
                    <div className="flex justify-center py-6"><LoadingSpinner /></div>
                  ) : allSlots.length === 0 ? (
                    <div className="text-center py-6 text-gray-400">
                      <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Aucune case configurée dans ce conteneur.</p>
                    </div>
                  ) : sizeSlots.length === 0 ? (
                    <div className="text-center py-6 text-gray-400">
                      <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Aucune case taille {sizeCategory} dans ce conteneur.</p>
                    </div>
                  ) : (
                    <>
                      <div className={clsx('flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium',
                        freeCount === 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800')}>
                        {freeCount === 0
                          ? `Aucune case libre taille ${sizeCategory}`
                          : `${freeCount} case${freeCount > 1 ? 's' : ''} libre${freeCount > 1 ? 's' : ''} sur ${sizeSlots.length}`}
                      </div>

                      {['S', 'M', 'L'].map((size) => {
                        const group = allSlots.filter(s => s.size === size);
                        if (group.length === 0) return null;
                        const isActiveSize = size === sizeCategory;
                        return (
                          <div key={size} className={clsx(!isActiveSize && 'opacity-25 pointer-events-none select-none')}>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                              Taille {size}{!isActiveSize ? ' (autre taille)' : ''}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {group.map((slot) => {
                                const isFree = slot.status === 'free';
                                const isChosen = slotId === slot.id;
                                return (
                                  <button key={slot.id} type="button" disabled={!isFree}
                                    onClick={() => { setSlotId(slot.id); setSlotCode(slot.slot_code); setSkipContainer(false); }}
                                    className={clsx(
                                      'w-16 h-14 rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all text-xs font-mono font-bold',
                                      slot.status === 'reserved' && 'border-amber-200 bg-amber-50 text-amber-500 cursor-not-allowed',
                                      slot.status === 'occupied' && 'border-red-200 bg-red-50 text-red-400 cursor-not-allowed',
                                      isFree && !isChosen && 'border-gray-200 bg-white text-gray-700 hover:border-[#2D5016] hover:bg-green-50 cursor-pointer',
                                      isFree && isChosen && 'border-[#2D5016] bg-[#2D5016] text-white shadow-lg scale-110 cursor-pointer',
                                    )}>
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
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 pt-2 border-t border-gray-100">
                        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded border-2 border-gray-200 bg-white inline-block" />Libre</span>
                        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded border-2 border-[#2D5016] bg-[#2D5016] inline-block" />Sélectionnée</span>
                        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded border-2 border-amber-200 bg-amber-50 inline-block" />Réservée</span>
                        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded border-2 border-red-200 bg-red-50 inline-block" />Occupée</span>
                      </div>

                      {slotId && (
                        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                          <p className="text-sm text-green-800">
                            Case <strong className="font-mono">{slotCode}</strong> sélectionnée dans <strong>{selectedContainer?.name}</strong>
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Étape 3 : Récapitulatif ──────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-gray-900">Récapitulatif</h2>
              <div className="p-5 bg-gray-50 rounded-xl space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium',
                    type === 'don' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700')}>
                    {type === 'don' ? '🎁 Don' : '💰 Vente'}
                  </span>
                  {selectedCategory && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                      {selectedCategory.name}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
                {description && <p className="text-gray-600 text-sm">{description}</p>}
                <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t border-gray-200">
                  <div><span className="text-gray-500">État :</span> <strong>{CONDITION_LABELS[condition]}</strong></div>
                  <div><span className="text-gray-500">Lieu :</span> <strong>{location}</strong></div>
                  {type === 'vente' && price && <div><span className="text-gray-500">Prix :</span> <strong>{price} €</strong></div>}
                  {weight && <div><span className="text-gray-500">Poids :</span> <strong>{weight} kg</strong></div>}
                  {sizeCategory && (
                    <div><span className="text-gray-500">Taille :</span>{' '}
                      <strong className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">{sizeCategory}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Résumé conteneur */}
              {!skipContainer && containerId && slotId ? (
                <div className="p-4 bg-green-50 rounded-xl border border-green-200 flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-green-800">Case réservée : <span className="font-mono">{slotCode}</span></p>
                    <p className="text-xs text-green-700 mt-0.5">{selectedContainer?.name} — {selectedContainer?.address}</p>
                    <p className="text-xs text-green-600 mt-1">Une demande de dépôt sera créée et validée par notre équipe.</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-2 text-sm text-gray-400">
                  <SkipForward className="w-4 h-4 flex-shrink-0" />
                  Pas de dépôt en conteneur pour cette annonce.
                </div>
              )}

              {images.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">{images.length} photo{images.length > 1 ? 's' : ''}</p>
                  <div className="flex flex-wrap gap-2">
                    {images.map((url) => (
                      <img key={url} src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-sm text-amber-800">
                  Votre annonce sera vérifiée par notre équipe avant publication (généralement sous 24h).
                </p>
              </div>
            </div>
          )}

          {/* ── Boutons ──────────────────────────────────────────────────── */}
          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-100">
            {step > 0 && (
              <button type="button" onClick={goBack} className="btn-secondary flex-1">Retour</button>
            )}
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={goNext} className="btn-primary flex-1">Suivant</button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={createMutation.isPending} className="btn-coral flex-1">
                {createMutation.isPending ? 'Publication...' : "Publier l'annonce"}
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
