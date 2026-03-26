import { useState } from 'react';
import { CheckCircle, Upload, X } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useQuery, useMutation } from '@tanstack/react-query';
import { categoryService, listingService, uploadService } from '../../services/api';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { particulierSidebar } from '../../config/sidebars';
import LoadingSpinner from '../../components/common/LoadingSpinner';

interface ListingForm {
  title: string;
  description: string;
  type: 'don' | 'vente';
  category_id: number;
  condition: string;
  price: number;
  location: string;
}

const steps = ['Type & Catégorie', 'Détails', 'Récapitulatif'];

export default function CreateListingPage() {
  const [step, setStep] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const res = await uploadService.upload(file);
        setImages(prev => [...prev, res.data.url]);
      }
    } catch {
      toast.error('Erreur lors du chargement de l\'image');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getAll(),
  });
  const categories = categoriesData?.data || [];

  const { register, handleSubmit, watch, formState: { errors }, trigger } = useForm<ListingForm>({
    defaultValues: { type: 'don', condition: 'bon_etat' },
  });

  const formValues = watch();

  const createMutation = useMutation({
    mutationFn: (data: ListingForm) => listingService.create(data),
    onSuccess: () => {
      toast.success('Annonce créée ! Elle est en attente de modération.');
      navigate('/dashboard');
    },
    onError: () => toast.error('Erreur lors de la création'),
  });

  const nextStep = async () => {
    const fields: (keyof ListingForm)[][] = [
      ['type', 'category_id'],
      ['title', 'description', 'condition', 'location'],
      [],
    ];
    const valid = await trigger(fields[step]);
    if (valid) setStep(s => s + 1);
  };

  const onSubmit = (data: ListingForm) => {
    createMutation.mutate({ ...data, category_id: Number(data.category_id), images: images.join(',') } as any);
  };

  const selectedCategory = categories.find(c => c.id === Number(formValues.category_id));

  return (
    <DashboardLayout sidebarItems={particulierSidebar} title="Créer une annonce">
      <div className="max-w-2xl mx-auto">
        {/* Stepper */}
        <div className="flex items-center gap-4 mb-8">
          {steps.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                i < step ? 'bg-green-500 text-white' : i === step ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-500'
              )}>
                {i < step ? <CheckCircle className="w-5 h-5" /> : i + 1}
              </div>
              <span className={clsx('text-sm font-medium hidden sm:block', i === step ? 'text-primary-500' : i < step ? 'text-green-600' : 'text-gray-400')}>
                {label}
              </span>
              {i < steps.length - 1 && (
                <div className={clsx('flex-1 h-0.5 min-w-[2rem]', i < step ? 'bg-green-500' : 'bg-gray-200')} />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="card">
            {/* Step 1: Type & Category */}
            {step === 0 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Type d'annonce</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { value: 'don', label: 'Don', desc: 'Je donne gratuitement', icon: '🎁', color: 'border-green-500 bg-green-50' },
                      { value: 'vente', label: 'Vente', desc: 'Je vends avec un prix', icon: '💰', color: 'border-coral-500 bg-coral-400/10' },
                    ].map((opt) => (
                      <label key={opt.value} className={clsx(
                        'flex flex-col items-center gap-2 p-5 border-2 rounded-xl cursor-pointer transition-all',
                        formValues.type === opt.value ? opt.color : 'border-gray-200 hover:border-gray-300'
                      )}>
                        <input {...register('type')} type="radio" value={opt.value} className="sr-only" />
                        <span className="text-3xl">{opt.icon}</span>
                        <span className="font-bold text-gray-900">{opt.label}</span>
                        <span className="text-xs text-gray-500">{opt.desc}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Catégorie</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {categories.map((cat) => (
                      <label key={cat.id} className={clsx(
                        'flex items-center gap-2 p-3 border-2 rounded-xl cursor-pointer transition-all',
                        Number(formValues.category_id) === cat.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                      )}>
                        <input {...register('category_id', { required: true, valueAsNumber: true })} type="radio" value={cat.id} className="sr-only" />
                        <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                      </label>
                    ))}
                  </div>
                  {errors.category_id && <p className="text-red-500 text-xs mt-2">Veuillez sélectionner une catégorie</p>}
                </div>
              </div>
            )}

            {/* Step 2: Details */}
            {step === 1 && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold text-gray-900">Détails de l'annonce</h2>
                <div>
                  <label className="label">Titre de l'annonce *</label>
                  <input
                    {...register('title', { required: 'Titre requis', minLength: { value: 5, message: 'Minimum 5 caractères' } })}
                    className="input"
                    placeholder="Ex: Table basse en bois massif"
                  />
                  {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea
                    {...register('description')}
                    className="input min-h-[120px] resize-none"
                    placeholder="Décrivez votre objet (état, dimensions, particularités...)"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">État</label>
                    <select {...register('condition')} className="input">
                      <option value="neuf">Neuf</option>
                      <option value="bon_etat">Bon état</option>
                      <option value="use">Usé</option>
                      <option value="pieces">Pour pièces</option>
                    </select>
                  </div>
                  {formValues.type === 'vente' && (
                    <div>
                      <label className="label">Prix (€)</label>
                      <input
                        {...register('price', { valueAsNumber: true, min: 0 })}
                        type="number"
                        step="0.01"
                        className="input"
                        placeholder="0.00"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="label">Localisation</label>
                  <input
                    {...register('location', { required: 'Localisation requise' })}
                    className="input"
                    placeholder="Ex: Paris 11e"
                  />
                  {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location.message}</p>}
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
                            <button
                              type="button"
                              onClick={() => setImages(prev => prev.filter(u => u !== url))}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <label className={clsx(
                      'flex items-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors text-sm',
                      uploading ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed' : 'border-gray-300 hover:border-primary-400 hover:bg-primary-50 text-gray-500'
                    )}>
                      {uploading ? <LoadingSpinner size="sm" /> : <Upload className="w-4 h-4" />}
                      {uploading ? 'Chargement...' : 'Ajouter des photos'}
                      <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="sr-only" disabled={uploading} />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 2 && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold text-gray-900">Récapitulatif</h2>
                <div className="p-5 bg-gray-50 rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <span className={clsx('badge', formValues.type === 'don' ? 'bg-green-100 text-green-700' : 'bg-coral-400/20 text-coral-600')}>
                      {formValues.type === 'don' ? 'Don' : 'Vente'}
                    </span>
                    {selectedCategory && <span className="badge-blue">{selectedCategory.name}</span>}
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg">{formValues.title || 'Sans titre'}</h3>
                  <p className="text-gray-600 text-sm">{formValues.description || 'Pas de description'}</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-500">État :</span> <strong>{formValues.condition}</strong></div>
                    <div><span className="text-gray-500">Lieu :</span> <strong>{formValues.location}</strong></div>
                    {formValues.type === 'vente' && (
                      <div><span className="text-gray-500">Prix :</span> <strong>{formValues.price}€</strong></div>
                    )}
                  </div>
                </div>
                {images.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">{images.length} photo{images.length > 1 ? 's' : ''} ajoutée{images.length > 1 ? 's' : ''}</p>
                    <div className="flex flex-wrap gap-2">
                      {images.map((url) => (
                        <img key={url} src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                      ))}
                    </div>
                  </div>
                )}
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-sm text-amber-700">
                    ⏳ Votre annonce sera vérifiée par notre équipe avant publication (généralement sous 24h).
                  </p>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 mt-6 pt-6 border-t border-gray-100">
              {step > 0 && (
                <button type="button" onClick={() => setStep(s => s - 1)} className="btn-secondary flex-1">
                  Retour
                </button>
              )}
              {step < steps.length - 1 ? (
                <button type="button" onClick={nextStep} className="btn-primary flex-1">
                  Suivant
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn-coral flex-1"
                >
                  {createMutation.isPending ? 'Publication...' : 'Publier l\'annonce'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
