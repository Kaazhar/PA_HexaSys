import { Link } from 'react-router-dom';
import { ArrowRight, Package, Truck, Wrench } from 'lucide-react';
import PublicLayout from '../../components/layout/PublicLayout';
import { useQuery } from '@tanstack/react-query';
import { listingService } from '../../services/api';
import ListingCard from '../../components/common/ListingCard';

export default function HomePage() {
  const { data: listingsData } = useQuery({
    queryKey: ['listings', 'recent'],
    queryFn: () => listingService.getAll({ limit: 4, status: 'active' }),
  });

  const listings = listingsData?.data?.listings || [];

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="bg-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold leading-tight mb-4">
              Donnez une seconde vie à vos objets
            </h1>
            <p className="text-lg text-white/80 mb-8">
              La plateforme d'upcycling qui connecte les particuliers, professionnels et formateurs.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/register" className="inline-flex items-center gap-2 bg-white text-primary-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                Commencer <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/annonces" className="inline-flex items-center gap-2 border border-white/50 text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors">
                Voir les annonces
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Comment ça marche ?</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">
              En quelques étapes simples, participez à l'économie circulaire et réduisez votre impact environnemental.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Package className="w-8 h-8" />,
                title: 'Déposez vos objets',
                description: 'Publiez une annonce pour donner ou vendre vos objets inutilisés.',
                step: '01',
                color: 'bg-blue-50 text-blue-500',
              },
              {
                icon: <Truck className="w-8 h-8" />,
                title: 'Connectez-vous',
                description: 'Trouvez des particuliers ou professionnels intéressés par vos objets.',
                step: '02',
                color: 'bg-primary-50 text-primary-500',
              },
              {
                icon: <Wrench className="w-8 h-8" />,
                title: 'Upcyclez',
                description: 'Participez à des ateliers et formations pour transformer vos objets.',
                step: '03',
                color: 'bg-coral-400/10 text-coral-500',
              },
            ].map((step, i) => (
              <div key={i} className="relative p-8 bg-gray-50 rounded-2xl hover:bg-beige-50 transition-colors">
                <div className="absolute top-6 right-6 text-5xl font-black text-gray-100">
                  {step.step}
                </div>
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 ${step.color}`}>
                  {step.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent listings */}
      <section className="py-20 bg-beige-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Annonces récentes</h2>
              <p className="text-gray-500 mt-2">Découvrez les dernières annonces de la communauté</p>
            </div>
            <Link
              to="/annonces"
              className="inline-flex items-center gap-2 text-primary-500 font-medium hover:text-primary-600 transition-colors"
            >
              Voir tout <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {listings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucune annonce disponible pour le moment</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Prêt à rejoindre la communauté ?
          </h2>
          <p className="text-white/70 text-lg mb-8">
            Inscrivez-vous gratuitement et commencez à upcycler dès aujourd'hui.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-coral-500 text-white px-8 py-4 rounded-xl font-semibold hover:bg-coral-600 transition-colors text-lg shadow-lg"
          >
            Commencer maintenant
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
