import { useParams, Link } from 'react-router-dom';
import { Calendar, MapPin, Clock, Users, ArrowLeft, User as UserIcon, Tag, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PublicLayout from '../../components/layout/PublicLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { workshopService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';
import clsx from 'clsx';

const typeLabels: Record<string, string> = {
  atelier: 'Atelier',
  formation: 'Formation',
  conference: 'Conférence',
};

export default function WorkshopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const [booked, setBooked] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['workshop', id],
    queryFn: () => workshopService.getOne(Number(id)),
    enabled: !!id,
  });

  const workshop = data?.data;

  const bookMutation = useMutation({
    mutationFn: () => workshopService.book(Number(id)),
    onSuccess: () => {
      setBooked(true);
      queryClient.invalidateQueries({ queryKey: ['workshop', id] });
    },
  });

  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/formations" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Retour aux formations
        </Link>

        {isLoading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : isError || !workshop ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">Formation introuvable</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main */}
            <div className="lg:col-span-2 space-y-5">
              <div className="h-56 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center relative overflow-hidden">
                <span className="text-white/20 text-8xl font-bold">
                  {workshop.title?.charAt(0)?.toUpperCase()}
                </span>
                <div className="absolute top-4 left-4">
                  <span className="badge bg-white/20 text-white backdrop-blur-sm font-medium">
                    {typeLabels[workshop.type] || workshop.type}
                  </span>
                </div>
              </div>

              <div className="card space-y-4">
                <h1 className="text-2xl font-bold text-gray-900">{workshop.title}</h1>

                <div className="grid grid-cols-2 gap-3 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary-500" />
                    {format(new Date(workshop.date), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary-500" />
                    Durée : {workshop.duration} min
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary-500" />
                    {workshop.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary-500" />
                    {workshop.enrolled} / {workshop.max_spots} inscrits
                  </div>
                  {workshop.category && (
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-primary-500" />
                      {workshop.category.name}
                    </div>
                  )}
                </div>

                {workshop.description && (
                  <div>
                    <h2 className="font-semibold text-gray-900 mb-2">Description</h2>
                    <p className="text-gray-600 whitespace-pre-line leading-relaxed">{workshop.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Price + booking */}
              <div className="card">
                <div className="text-center mb-4">
                  <p className="text-sm text-gray-500 mb-1">Prix</p>
                  <p className="text-3xl font-bold text-primary-600">
                    {workshop.price === 0 ? 'Gratuit' : `${workshop.price}€`}
                  </p>
                </div>

                {booked ? (
                  <div className="flex items-center gap-2 justify-center text-green-600 bg-green-50 rounded-lg py-3">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Inscription confirmée !</span>
                  </div>
                ) : workshop.enrolled >= workshop.max_spots ? (
                  <button disabled className="btn-primary w-full opacity-50 cursor-not-allowed">
                    Complet
                  </button>
                ) : !isAuthenticated ? (
                  <Link to="/login" className="btn-primary w-full text-center block">
                    Se connecter pour s'inscrire
                  </Link>
                ) : (
                  <button
                    onClick={() => bookMutation.mutate()}
                    disabled={bookMutation.isPending}
                    className="btn-primary w-full"
                  >
                    {bookMutation.isPending ? 'Inscription...' : "S'inscrire"}
                  </button>
                )}

                {bookMutation.isError && (
                  <p className="text-xs text-red-500 text-center mt-2">
                    Une erreur est survenue. Vous êtes peut-être déjà inscrit.
                  </p>
                )}

                <div className="mt-3 text-xs text-gray-400 text-center">
                  Minimum {workshop.min_spots} participants requis
                </div>
              </div>

              {/* Instructor */}
              {workshop.instructor && (
                <div className="card">
                  <h2 className="font-semibold text-gray-900 mb-3">Animateur</h2>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <UserIcon className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {workshop.instructor.firstname} {workshop.instructor.lastname}
                      </p>
                      <p className="text-xs text-gray-500">Salarié UpcycleConnect</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Spots bar */}
              <div className="card">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Places occupées</span>
                  <span className="font-medium">{workshop.enrolled}/{workshop.max_spots}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={clsx('h-2 rounded-full transition-all', workshop.enrolled >= workshop.max_spots ? 'bg-red-400' : 'bg-primary-500')}
                    style={{ width: `${Math.min(100, (workshop.enrolled / workshop.max_spots) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
