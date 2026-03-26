import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, Clock, ArrowLeft, Tag, BadgeCheck, User as UserIcon, Briefcase, Building2, Users, Calendar, TrendingUp, Star, MessageCircle, Send, Flag } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PublicLayout from '../../components/layout/PublicLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { listingService, siretService, reviewService, messageService, reportService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';
import { useState } from 'react';
import toast from 'react-hot-toast';

const conditionLabels: Record<string, string> = {
  neuf: 'Neuf',
  bon_etat: 'Bon état',
  use: 'Usé',
  pieces: 'Pour pièces',
};

const roleLabels: Record<string, string> = {
  particulier: 'Particulier',
  professionnel: 'Professionnel',
  salarie: 'Salarié',
};

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange?.(s)}
          onMouseEnter={() => onChange && setHovered(s)}
          onMouseLeave={() => onChange && setHovered(0)}
          className={onChange ? 'cursor-pointer' : 'cursor-default'}
        >
          <Star
            className={clsx('w-5 h-5', s <= (hovered || value) ? 'fill-amber-400 text-amber-400' : 'text-gray-200')}
          />
        </button>
      ))}
    </div>
  );
}

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => listingService.getOne(Number(id)),
    enabled: !!id,
  });

  const listing = data?.data;
  const seller = listing?.user;

  const { data: companyData } = useQuery({
    queryKey: ['company', seller?.siret],
    queryFn: () => siretService.getCompanyBySiret(seller!.siret!),
    enabled: !!seller?.siret_verified && !!seller?.siret,
    retry: false,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['listing-reviews', id],
    queryFn: () => reviewService.getForListing(Number(id)),
    enabled: !!id,
  });

  const reviews = reviewsData?.data ?? [];

  const reviewMutation = useMutation({
    mutationFn: () => reviewService.create(Number(id), { rating: reviewRating, comment: reviewComment }),
    onSuccess: () => {
      setReviewComment('');
      setReviewRating(5);
      queryClient.invalidateQueries({ queryKey: ['listing-reviews', id] });
    },
  });

  const contactMutation = useMutation({
    mutationFn: () => messageService.getOrCreate({ other_user_id: seller!.id, listing_id: Number(id) }),
    onSuccess: (res) => {
      navigate('/messages', { state: { conversationId: res.data.id } });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || `Erreur ${err?.response?.status || ''}: Impossible de contacter le vendeur.`),
  });

  const reportMutation = useMutation({
    mutationFn: () => reportService.create(Number(id), { reason: reportReason, details: reportDetails }),
    onSuccess: () => {
      toast.success('Signalement envoyé, merci.');
      setShowReportModal(false);
      setReportReason('');
      setReportDetails('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Erreur lors du signalement.'),
  });

  const company = companyData?.data;

  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/annonces" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Retour aux annonces
        </Link>

        {isLoading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : isError || !listing ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">Annonce introuvable</p>
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main listing info */}
            <div className="lg:col-span-2 space-y-5">
              {/* Images */}
              {(() => {
                const imgs = listing.images?.split(',').filter(Boolean) || [];
                return (
                  <div className="space-y-2">
                    <div className="h-72 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl relative overflow-hidden">
                      {imgs.length > 0 ? (
                        <img src={imgs[activeImage]} alt={listing.title} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-white/20 text-8xl font-bold">
                            {listing.title?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                      )}
                      <div className="absolute top-4 left-4 flex gap-2">
                        <span className={clsx('badge font-semibold', listing.type === 'don' ? 'bg-green-500 text-white' : 'bg-coral-500 text-white')}>
                          {listing.type === 'don' ? 'Don' : 'Vente'}
                        </span>
                        {listing.condition && (
                          <span className="badge bg-white/20 text-white backdrop-blur-sm">
                            {conditionLabels[listing.condition] || listing.condition}
                          </span>
                        )}
                      </div>
                      <div className="absolute bottom-4 right-4">
                        <span className="text-2xl font-bold text-white drop-shadow">
                          {listing.type === 'vente' && listing.price ? `${listing.price}€` : 'Gratuit'}
                        </span>
                      </div>
                    </div>
                    {imgs.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {imgs.map((url, i) => (
                          <button key={i} type="button" onClick={() => setActiveImage(i)}
                            className={clsx('flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors', i === activeImage ? 'border-primary-500' : 'border-transparent')}
                          >
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Details card */}
              <div className="card space-y-4">
                <h1 className="text-2xl font-bold text-gray-900">{listing.title}</h1>

                <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                  {listing.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      {listing.location}
                    </span>
                  )}
                  {listing.category && (
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-4 h-4" />
                      {listing.category.name}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {format(new Date(listing.created_at), 'dd MMMM yyyy', { locale: fr })}
                  </span>
                </div>

                {listing.description && (
                  <div>
                    <h2 className="font-semibold text-gray-900 mb-2">Description</h2>
                    <p className="text-gray-600 whitespace-pre-line leading-relaxed">{listing.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Seller card */}
            <div className="space-y-4">
              <div className="card">
                <h2 className="font-semibold text-gray-900 mb-4">Vendeur / Donateur</h2>

                {seller ? (
                  <div className="space-y-4">
                    {/* Avatar + name */}
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-600 font-bold text-lg">
                          {seller.firstname?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {seller.firstname} {seller.lastname}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            {seller.role === 'professionnel' ? (
                              <Briefcase className="w-3 h-3" />
                            ) : (
                              <UserIcon className="w-3 h-3" />
                            )}
                            {roleLabels[seller.role] || seller.role}
                          </span>
                          {seller.siret_verified && (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                              <BadgeCheck className="w-3 h-3" />
                              Pro vérifié
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Member since */}
                    {seller.created_at && (
                      <div className="text-xs text-gray-400 border-t border-gray-50 pt-3">
                        Membre depuis {format(new Date(seller.created_at), 'MMMM yyyy', { locale: fr })}
                      </div>
                    )}

                    {/* Company info */}
                    {company && (
                      <div className="border-t border-gray-50 pt-3 space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="w-4 h-4 text-primary-500" />
                          <p className="text-sm font-semibold text-gray-900">{company.company_name}</p>
                        </div>
                        {company.category && (
                          <p className="text-xs text-gray-500">{company.category}</p>
                        )}
                        <div className="grid grid-cols-1 gap-2 mt-2">
                          {company.address && (
                            <div className="flex items-start gap-2">
                              <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                              <div className="text-xs text-gray-600">
                                <p>{company.address}</p>
                                {company.city && <p className="text-gray-400">{company.postal_code} {company.city}</p>}
                              </div>
                            </div>
                          )}
                          {company.employees && (
                            <div className="flex items-center gap-2">
                              <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <p className="text-xs text-gray-600">{company.employees}</p>
                            </div>
                          )}
                          {company.date_creation && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <p className="text-xs text-gray-600">
                                Créée le {format(new Date(company.date_creation), 'dd MMMM yyyy', { locale: fr })}
                              </p>
                            </div>
                          )}
                          {company.turnover && (
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <p className="text-xs text-gray-600">
                                CA {company.turnover_year} : {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(company.turnover)}
                              </p>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 font-mono pt-1">
                          SIRET : {seller.siret}
                          {company.siren && <span> · SIREN : {company.siren}</span>}
                          {company.activity_code && <span> · APE : {company.activity_code}</span>}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Informations vendeur indisponibles</p>
                )}
              </div>

              {/* Report button */}
              {isAuthenticated && seller && seller.id !== user?.id && (
                <button
                  onClick={() => setShowReportModal(true)}
                  className="w-full flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-red-500 transition-colors py-1"
                >
                  <Flag className="w-3.5 h-3.5" />
                  Signaler cette annonce
                </button>
              )}

              {/* Price + Contact */}
              <div className="card bg-primary-50 border-primary-100">
                <div className="text-center mb-4">
                  {listing.type === 'vente' && listing.price ? (
                    <>
                      <p className="text-sm text-gray-500 mb-1">Prix demandé</p>
                      <p className="text-3xl font-bold text-primary-600">{listing.price}€</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-500 mb-1">Type</p>
                      <p className="text-2xl font-bold text-green-600">Don gratuit</p>
                    </>
                  )}
                </div>
                {isAuthenticated && seller && seller.id !== user?.id ? (
                  <button
                    onClick={() => contactMutation.mutate()}
                    disabled={contactMutation.isPending}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Contacter le vendeur
                  </button>
                ) : !isAuthenticated ? (
                  <Link to="/login" className="btn-primary w-full text-center block">
                    Se connecter pour contacter
                  </Link>
                ) : null}
              </div>
            </div>
          </div>

          {/* Reviews section */}
          <div className="mt-8 space-y-5">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400" />
              Avis ({reviews.length})
            </h2>

            {reviews.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reviews.map((r: any) => (
                  <div key={r.id} className="card">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {r.reviewer?.firstname?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                        <Link to={`/utilisateurs/${r.reviewer_id}`} className="text-sm font-medium text-gray-700 hover:text-primary-600">
                          {r.reviewer?.firstname} {r.reviewer?.lastname}
                        </Link>
                      </div>
                      <StarRating value={r.rating} />
                    </div>
                    {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
                    <p className="text-xs text-gray-400 mt-2">
                      {format(new Date(r.created_at), 'dd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {isAuthenticated && user?.id !== listing.user_id && (
              <div className="card">
                <h3 className="font-medium text-gray-900 mb-3">Laisser un avis</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Note</label>
                    <StarRating value={reviewRating} onChange={setReviewRating} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Commentaire</label>
                    <textarea
                      className="input w-full h-20 resize-none"
                      placeholder="Partagez votre expérience..."
                      value={reviewComment}
                      onChange={e => setReviewComment(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={() => reviewMutation.mutate()}
                    disabled={reviewMutation.isPending || !reviewComment.trim()}
                    className="btn-primary flex items-center gap-2 disabled:opacity-40"
                  >
                    <Send className="w-4 h-4" />
                    {reviewMutation.isPending ? 'Envoi...' : 'Publier'}
                  </button>
                  {reviewMutation.isError && (
                    <p className="text-xs text-red-500">Vous avez peut-être déjà laissé un avis.</p>
                  )}
                </div>
              </div>
            )}
          </div>
          </>
        )}
      </div>
      {showReportModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <Flag className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-semibold text-gray-900">Signaler cette annonce</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Raison *</label>
                <div className="space-y-2">
                  {[
                    { value: 'spam', label: 'Spam ou publicité' },
                    { value: 'inappropriate', label: 'Contenu inapproprié ou offensant' },
                    { value: 'fake', label: 'Annonce frauduleuse ou fausse' },
                    { value: 'prohibited', label: 'Objet interdit ou illégal' },
                    { value: 'other', label: 'Autre' },
                  ].map((r) => (
                    <label key={r.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="report-reason"
                        value={r.value}
                        checked={reportReason === r.value}
                        onChange={() => setReportReason(r.value)}
                        className="text-red-500"
                      />
                      <span className="text-sm text-gray-700">{r.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Détails <span className="text-gray-400 font-normal">(optionnel)</span>
                </label>
                <textarea
                  className="input w-full h-20 resize-none"
                  placeholder="Précisez le problème..."
                  value={reportDetails}
                  onChange={e => setReportDetails(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => { setShowReportModal(false); setReportReason(''); setReportDetails(''); }}
                className="btn-secondary"
              >
                Annuler
              </button>
              <button
                onClick={() => reportMutation.mutate()}
                disabled={!reportReason || reportMutation.isPending}
                className="bg-red-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-40"
              >
                {reportMutation.isPending ? 'Envoi...' : 'Envoyer le signalement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PublicLayout>
  );
}
