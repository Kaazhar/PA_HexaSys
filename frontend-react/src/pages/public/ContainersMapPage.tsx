import { MapPin, Package, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import PublicLayout from '../../components/layout/PublicLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { containerService } from '../../services/api';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Fix default Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const statusColors: Record<string, string> = {
  operational: 'bg-green-100 text-green-700',
  full: 'bg-red-100 text-red-700',
  maintenance: 'bg-amber-100 text-amber-700',
};

const statusLabels: Record<string, string> = {
  operational: 'Opérationnel',
  full: 'Complet',
  maintenance: 'Maintenance',
};

export default function ContainersMapPage() {
  const { isAuthenticated } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['containers'],
    queryFn: () => containerService.getAll(),
  });

  const containers = data?.data ?? [];
  const validContainers = containers.filter((c: any) => c.latitude && c.longitude);

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Conteneurs de collecte</h1>
          <p className="text-gray-500 text-sm">Déposez vos objets dans nos conteneurs répartis dans la ville</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Map */}
            <div className="lg:col-span-2 h-[500px] rounded-xl overflow-hidden shadow-sm border border-gray-100">
              {validContainers.length > 0 ? (
                <MapContainer
                  center={[validContainers[0].latitude, validContainers[0].longitude]}
                  zoom={12}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {validContainers.map((container: any) => (
                    <Marker key={container.id} position={[container.latitude, container.longitude]}>
                      <Popup>
                        <div className="min-w-[180px]">
                          <p className="font-semibold text-gray-900 mb-1">{container.name}</p>
                          <p className="text-xs text-gray-500 mb-2">{container.address}</p>
                          <div className="flex items-center justify-between text-xs">
                            <span className={clsx('px-2 py-0.5 rounded-full font-medium', statusColors[container.status])}>
                              {statusLabels[container.status]}
                            </span>
                            <span className="text-gray-500">
                              {container.current_count}/{container.capacity}
                            </span>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              ) : (
                <div className="h-full flex items-center justify-center bg-gray-50">
                  <p className="text-gray-400">Aucune donnée de position disponible</p>
                </div>
              )}
            </div>

            {/* List */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {containers.map((container: any) => (
                <div key={container.id} className="card">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary-500 flex-shrink-0" />
                      <p className="font-medium text-gray-900 text-sm">{container.name}</p>
                    </div>
                    <span className={clsx('badge text-xs', statusColors[container.status])}>
                      {statusLabels[container.status]}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                    <MapPin className="w-3.5 h-3.5" />
                    {container.address}
                  </div>

                  <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1">
                    <div
                      className={clsx('h-1.5 rounded-full', container.status === 'full' ? 'bg-red-400' : 'bg-primary-500')}
                      style={{ width: `${Math.min(100, (container.current_count / container.capacity) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    {container.current_count}/{container.capacity} objets
                  </p>
                </div>
              ))}

              {isAuthenticated && (
                <Link to="/conteneurs/demande" className="btn-primary w-full text-center block mt-2">
                  Faire une demande de dépôt
                </Link>
              )}

              {!isAuthenticated && (
                <div className="card bg-gray-50 text-center">
                  <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 mb-3">Connectez-vous pour faire une demande de dépôt</p>
                  <Link to="/login" className="btn-primary text-sm py-2">Se connecter</Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
