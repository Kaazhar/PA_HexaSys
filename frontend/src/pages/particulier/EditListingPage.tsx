import { useState, useEffect } from 'react';
import { CheckCircle, X, Upload, Image } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useQuery, useMutation } from '@tanstack/react-query';
import { categoryService, listingService, uploadService } from '../../services/api';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { particulierSidebar } from '../../config/sidebars';

interface ListingForm {
  title: string;
  description: string;
  type: 'don' | 'vente';
  category_id: number;
  condition: string;
  price: number;
  location: string;
}

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: listingData, isLoading: listingLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => listingService.getOne(Number(id)),
    enabled: !!id,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getAll(),
  });

  const listing = listingData?.data;
  const categories = categoriesData?.data || [];

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<ListingForm>({
    defaultValues: { type: 'don', condition: 'bon_etat' },
  });

  useEffect(() => {
    if (listing) {
      reset({
        title: listing.title,
        description: listing.description,
        type: listing.type as 'don' | 'vente',
        category_id: listing.category_id,
        condition: listing.condition,
        price: listing.price,
        location: listing.location,
      });
      if (listing.images) {
        setImages(listing.images.split(',').filter(Boolean));
      }
    }
  }, [listing, reset]);

  const formValues = watch();

  const updateMutation = useMutation({
    mutationFn: (data: ListingForm & { images: string }) =>
      listingService.update(Number(id), data),
    onSuccess: () => {
      toast.success('Annonce mise à jour ! Elle repassera en modération.');
      navigate('/mes-annonces');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
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

  const removeImage = (url: string) => setImages(prev => prev.filter(u => u !== url));

  const onSubmit = (data: ListingForm) => {
    updateMutation.mutate({
      ...data,
      category_id: Number(data.category_id),
      images: images.join(','),
    });
  };

  if (listingLoading) {
    return (
      <DashboardLayout sidebarItems={particulierSidebar} title="Modifier l'annonce">
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebarItems={particulierSidebar} title="Modifier l'annonce">
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="card space-y-5">
            <h2 className="text-lg font-bold text-gray-900">Modifier : {listing?.title}</h2>

            {/* Type */}
            <div>
              <label className="label">Type d'annonce</label>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: 'don', label: 'Don', icon: '🎁', color: 'border-green-500 bg-green-50' },
                  { value: 'vente', label: 'Vente', icon: '💰', color: 'border-coral-500 bg-coral-400/10' },
                ].map((opt) => (
                  <label key={opt.value} className={clsx(
                    'flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all',
                    formValues.type === opt.value ? opt.color : 'border-gray-200 hover:border-gray-300'
                  )}>
                    <input {...register('type')} type="radio" value={opt.value} className="sr-only" />
                    <span className="text-2xl">{opt.icon}</span>
                    <span className="font-bold text-gray-900">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="label">Catégorie</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categories.map((cat) => (
                  <label key={cat.id} className={clsx(
                    'flex items-center gap-2 p-2.5 border-2 rounded-lg cursor-pointer transition-all text-sm',
                    Number(formValues.category_id) === cat.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                  )}>
                    <input {...register('category_id', { required: true, valueAsNumber: true })} type="radio" value={cat.id} className="sr-only" />
                    {cat.name}
                  </label>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="label">Titre *</label>
              <input
                {...register('title', { required: 'Titre requis', minLength: { value: 5, message: 'Minimum 5 caractères' } })}
                className="input"
              />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="label">Description</label>
              <textarea {...register('description')} className="input min-h-[100px] resize-none" />
            </div>

            {/* Condition + Price */}
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
                  <input {...register('price', { valueAsNumber: true, min: 0 })} type="number" step="0.01" className="input" />
                </div>
              )}
            </div>

            {/* Location */}
            <div>
              <label className="label">Localisation</label>
              <input {...register('location', { required: 'Requis' })} className="input" />
              {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location.message}</p>}
            </div>

            {/* Images */}
            <div>
              <label className="label">Photos</label>
              <div className="space-y-3">
                {images.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {images.map((url) => (
                      <div key={url} className="relative group">
                        <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
                        <button
                          type="button"
                          onClick={() => removeImage(url)}
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
                  uploading ? 'border-gray-200 bg-gray-50 text-gray-400' : 'border-gray-300 hover:border-primary-400 hover:bg-primary-50 text-gray-500'
                )}>
                  {uploading ? <LoadingSpinner size="sm" /> : <Upload className="w-4 h-4" />}
                  {uploading ? 'Chargement...' : 'Ajouter des photos'}
                  <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="sr-only" disabled={uploading} />
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <button type="button" onClick={() => navigate('/mes-annonces')} className="btn-secondary flex-1">
                Annuler
              </button>
              <button type="submit" disabled={updateMutation.isPending} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {updateMutation.isPending ? 'Enregistrement...' : (
                  <><CheckCircle className="w-4 h-4" /> Enregistrer</>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
