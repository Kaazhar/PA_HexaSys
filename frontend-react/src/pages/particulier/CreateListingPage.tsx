import { useState } from 'react';
import { Upload, X } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useQuery, useMutation } from '@tanstack/react-query';
import { categoryService, listingService, uploadService, containerService } from '../../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { particulierSidebar, proSidebar, adminSidebar } from '../../config/sidebars';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ImageCropModal from '../../components/common/ImageCropModal';
import type { ContainerSlot } from '../../types';
import { useTranslation } from 'react-i18next';

export default function CreateListingPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const sidebar = user?.role === 'professionnel' ? proSidebar : user?.role === 'admin' ? adminSidebar : particulierSidebar;
  const navigate = useNavigate();

  const SIZE_OPTIONS = [
    { value: 'S', label: `S — ${t('create_listing.size_s_label')}`, desc: '≤ 30×30×30 cm · ≤ 5 kg', example: t('create_listing.size_s_example') },
    { value: 'M', label: `M — ${t('create_listing.size_m_label')}`, desc: '≤ 60×40×40 cm · ≤ 15 kg', example: t('create_listing.size_m_example') },
    { value: 'L', label: `L — ${t('create_listing.size_l_label')}`, desc: '≤ 100×60×60 cm · ≤ 30 kg', example: t('create_listing.size_l_example') },
  ];

  const CONDITION_LABELS: Record<string, string> = {
    neuf: t('listings.condition.neuf'),
    bon_etat: t('listings.condition.bon_etat'),
    use: t('listings.condition.use'),
    pieces: t('listings.condition.pieces'),
  };

  const STEPS = [
    t('create_listing.step_type'),
    t('create_listing.step_details'),
    t('create_listing.step_container'),
    t('create_listing.step_summary'),
  ];

  const [step, setStep] = useState(0);

  const [type, setType] = useState<'don' | 'vente'>('don');
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('bon_etat');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [weight, setWeight] = useState('');
  const [sizeCategory, setSizeCategory] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [cropQueue, setCropQueue] = useState<File[]>([]);

  const [containerId, setContainerId] = useState<number | null>(null);
  const [slotId, setSlotId] = useState<number | null>(null);
  const [slotCode, setSlotCode] = useState('');
  const [skipContainer, setSkipContainer] = useState(false);

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    setCropQueue(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const handleCropConfirm = async (cropped: File) => {
    setCropQueue(prev => prev.slice(1));
    setUploading(true);
    try {
      const res = await uploadService.upload(cropped);
      setImages(prev => [...prev, res.data.url]);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setUploading(false);
    }
  };

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
        toast.success(`${t('create_listing.publish')} — ${slotCode}`);
      } else {
        toast.success(t('create_listing.publish'));
      }
      navigate('/dashboard');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || t('common.error'));
    },
  });

  const goNext = () => {
    if (step === 0) {
      if (!categoryId) { toast.error(t('create_listing.category_title')); return; }
      setStep(1);
    } else if (step === 1) {
      if (!title.trim() || title.trim().length < 5) { toast.error(t('create_listing.title_field')); return; }
      if (!location.trim()) { toast.error(t('create_listing.location_field')); return; }
      if (!sizeCategory) { toast.error(t('create_listing.size_title')); return; }
      setSlotId(null);
      setSlotCode('');
      setStep(2);
    } else if (step === 2) {
      if (!skipContainer && containerId && !slotId) {
        toast.error(t('create_listing.slots_title'));
        return;
      }
      setStep(3);
    }
  };

  const goBack = () => setStep(s => Math.max(0, s - 1));

  const handleSubmit = () => {
    if (!categoryId || !title.trim() || !location.trim() || !sizeCategory) {
      toast.error(t('common.error'));
      return;
    }
    createMutation.mutate();
  };

  return (
    <DashboardLayout sidebarItems={sidebar} title={t('create_listing.title')}>
      <div className="max-w-2xl mx-auto">

        
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all',
                i < step ? 'bg-green-500 text-white' : i === step ? 'bg-[#2D5016] text-white' : 'bg-gray-200 text-gray-500'
              )}>
                {i + 1}
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

          
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">{t('create_listing.type_title')}</h2>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { value: 'don' as const, label: t('create_listing.don_label'), desc: t('create_listing.don_desc'), sel: 'border-green-500 bg-green-50' },
                    { value: 'vente' as const, label: t('create_listing.vente_label'), desc: t('create_listing.vente_desc'), sel: 'border-orange-400 bg-orange-50' },
                  ].map((opt) => (
                    <button key={opt.value} type="button" onClick={() => setType(opt.value)}
                      className={clsx('flex flex-col items-center gap-2 p-5 border-2 rounded-xl transition-all',
                        type === opt.value ? opt.sel : 'border-gray-200 hover:border-gray-300')}>
                      <span className="font-bold text-gray-900">{opt.label}</span>
                      <span className="text-xs text-gray-500">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">{t('create_listing.category_title')}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {categories.map((cat) => (
                    <button key={cat.id} type="button" onClick={() => setCategoryId(cat.id)}
                      className={clsx('flex items-center gap-2 p-3 border-2 rounded-xl transition-all text-left',
                        categoryId === cat.id ? 'border-[#2D5016] bg-green-50' : 'border-gray-200 hover:border-gray-300')}>
                      <span className="text-sm font-medium text-gray-700 flex-1">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-gray-900">{t('create_listing.details_title')}</h2>

              <div>
                <label className="label">{t('create_listing.title_field')}</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  className="input" placeholder="Ex: Table basse en bois massif" maxLength={100} />
              </div>

              <div>
                <label className="label">{t('create_listing.description_field')}</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  className="input min-h-[100px] resize-none"
                  placeholder="Décrivez votre objet (état, dimensions, particularités...)" maxLength={1000} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">{t('create_listing.state_field')}</label>
                  <select value={condition} onChange={e => setCondition(e.target.value)} className="input">
                    <option value="neuf">{t('listings.condition.neuf')}</option>
                    <option value="bon_etat">{t('listings.condition.bon_etat')}</option>
                    <option value="use">{t('listings.condition.use')}</option>
                    <option value="pieces">{t('listings.condition.pieces')}</option>
                  </select>
                </div>
                {type === 'vente' && (
                  <div>
                    <label className="label">{t('create_listing.price')}</label>
                    <input type="number" value={price} onChange={e => { if (parseFloat(e.target.value) >= 0 || e.target.value === '') setPrice(e.target.value); }}
                      step="0.01" min="0" max="99999.99" className="input" placeholder="0.00"
                      onBlur={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) setPrice(Math.round(v * 100) / 100 + ''); }} />
                  </div>
                )}
              </div>

              <div>
                <label className="label">{t('create_listing.location_field')}</label>
                <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                  className="input" placeholder="Ex: Paris 11e" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">{t('create_listing.weight')}</label>
                  <input type="number" value={weight} onChange={e => { if (parseFloat(e.target.value) >= 0 || e.target.value === '') setWeight(e.target.value); }}
                    step="0.1" min="0" max="9999.9" className="input" placeholder="Ex: 2.5"
                    onBlur={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) setWeight(Math.round(v * 10) / 10 + ''); }} />
                </div>
              </div>

              <div>
                <label className="label">{t('create_listing.size_title')}</label>
                <p className="text-xs text-gray-400 mb-3">{t('create_listing.size_desc')}</p>
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
                    </button>
                  ))}
                </div>
              </div>

              
              <div>
                <label className="label">{t('create_listing.photos')} <span className="text-gray-400 font-normal">{t('create_listing.optional')}</span></label>
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
                    {uploading ? t('create_listing.uploading') : t('create_listing.add_photos')}
                    <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="sr-only" disabled={uploading} />
                  </label>
                </div>
              </div>
            </div>
          )}

          
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{t('create_listing.container_title')}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {t('create_listing.container_desc')} {sizeCategory && <strong>({sizeCategory})</strong>}.
                </p>
              </div>

              
              <button type="button" onClick={() => { setSkipContainer(true); setContainerId(null); setSlotId(null); setSlotCode(''); setStep(3); }}
                className="w-full p-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-all">
                {t('create_listing.skip_container')}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
                <div className="relative flex justify-center text-xs text-gray-400"><span className="bg-white px-3">{t('create_listing.or_choose')}</span></div>
              </div>

              
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
                              {isFull ? t('create_listing.full') : t('create_listing.available')}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{c.address}, {c.district}</p>
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                              <span>{t('create_listing.fill')}</span><span>{c.current_count}/{c.capacity}</span>
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

              
              {containerId && (
                <div className="space-y-4 pt-2 border-t border-gray-100">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{t('create_listing.slots_title')} — {selectedContainer?.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{t('create_listing.slots_desc', { size: sizeCategory })}</p>
                  </div>

                  {slotsQuery.isLoading ? (
                    <div className="flex justify-center py-6"><LoadingSpinner /></div>
                  ) : allSlots.length === 0 ? (
                    <div className="text-center py-6 text-gray-400">
                      <p className="text-sm">{t('create_listing.no_slots')}</p>
                    </div>
                  ) : sizeSlots.length === 0 ? (
                    <div className="text-center py-6 text-gray-400">
                      <p className="text-sm">{t('create_listing.no_size_slots', { size: sizeCategory })}</p>
                    </div>
                  ) : (
                    <>
                      <div className={clsx('flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium',
                        freeCount === 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800')}>
                        {freeCount === 0
                          ? t('create_listing.no_free_slots', { size: sizeCategory })
                          : t(freeCount > 1 ? 'create_listing.free_slots_plural' : 'create_listing.free_slots', { count: freeCount, total: sizeSlots.length })}
                      </div>

                      {['S', 'M', 'L'].map((size) => {
                        const group = allSlots.filter(s => s.size === size);
                        if (group.length === 0) return null;
                        const isActiveSize = size === sizeCategory;
                        return (
                          <div key={size} className={clsx(!isActiveSize && 'opacity-25 pointer-events-none select-none')}>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                              {t('create_listing.size_label', { size })}{!isActiveSize ? ` ${t('create_listing.other_size')}` : ''}
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
                                        {slot.status === 'reserved' ? t('create_listing.slot_reserved_abbr') : t('create_listing.slot_occupied_abbr')}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 pt-2 border-t border-gray-100">
                        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded border-2 border-gray-200 bg-white inline-block" />{t('create_listing.legend_free')}</span>
                        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded border-2 border-[#2D5016] bg-[#2D5016] inline-block" />{t('create_listing.legend_selected')}</span>
                        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded border-2 border-amber-200 bg-amber-50 inline-block" />{t('create_listing.legend_reserved')}</span>
                        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded border-2 border-red-200 bg-red-50 inline-block" />{t('create_listing.legend_occupied')}</span>
                      </div>

                      {slotId && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                          <p className="text-sm text-green-800">
                            {t('create_listing.slot_chosen', { code: slotCode, name: selectedContainer?.name })}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-gray-900">{t('create_listing.summary_title')}</h2>
              <div className="p-5 bg-gray-50 rounded-xl space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium',
                    type === 'don' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700')}>
                    {type === 'don' ? t('create_listing.don_label') : t('create_listing.vente_label')}
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
                  <div><span className="text-gray-500">{t('create_listing.state_field')} :</span> <strong>{CONDITION_LABELS[condition]}</strong></div>
                  <div><span className="text-gray-500">{t('create_listing.location_field')} :</span> <strong>{location}</strong></div>
                  {type === 'vente' && price && <div><span className="text-gray-500">{t('create_listing.price')} :</span> <strong>{price} €</strong></div>}
                  {weight && <div><span className="text-gray-500">{t('create_listing.weight')} :</span> <strong>{weight} kg</strong></div>}
                  {sizeCategory && (
                    <div><span className="text-gray-500">{t('create_listing.size_field')} :</span>{' '}
                      <strong className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">{sizeCategory}</strong>
                    </div>
                  )}
                </div>
              </div>

              
              {!skipContainer && containerId && slotId ? (
                <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                  <div>
                    <p className="text-sm font-semibold text-green-800">{t('create_listing.slot_reserved')} <span className="font-mono">{slotCode}</span></p>
                    <p className="text-xs text-green-700 mt-0.5">{selectedContainer?.name} — {selectedContainer?.address}</p>
                    <p className="text-xs text-green-600 mt-1">{t('create_listing.deposit_note')}</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm text-gray-400">
                  {t('create_listing.no_container')}
                </div>
              )}

              {images.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">{t(images.length > 1 ? 'create_listing.photos_count_plural' : 'create_listing.photos_count', { count: images.length })}</p>
                  <div className="flex flex-wrap gap-2">
                    {images.map((url) => (
                      <img key={url} src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-sm text-amber-800">{t('create_listing.moderation_note')}</p>
              </div>
            </div>
          )}

          
          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-100">
            {step > 0 && (
              <button type="button" onClick={goBack} className="btn-secondary flex-1">{t('create_listing.back')}</button>
            )}
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={goNext} className="btn-primary flex-1">{t('create_listing.next')}</button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={createMutation.isPending} className="btn-coral flex-1">
                {createMutation.isPending ? t('create_listing.publishing') : t('create_listing.publish')}
              </button>
            )}
          </div>
        </div>
      </div>

      {cropQueue.length > 0 && (
        <ImageCropModal
          key={`${cropQueue[0].name}-${cropQueue[0].size}-${cropQueue.length}`}
          file={cropQueue[0]}
          onCancel={() => setCropQueue(prev => prev.slice(1))}
          onConfirm={handleCropConfirm}
        />
      )}
    </DashboardLayout>
  );
}
