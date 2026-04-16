import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Package } from 'lucide-react';
import PublicLayout from '../../components/layout/PublicLayout';
import { useQuery } from '@tanstack/react-query';
import { containerService } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import clsx from 'clsx';

// Fix leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const statusLabel: Record<string, string> = {
  operational: 'Disponible',
  full: 'Plein',
  maintenance: 'En maintenance',
};

const statusClass: Record<string, string> = {
  operational: 'badge-green',
  full: 'badge-red',
  maintenance: 'badge-yellow',
};

export default function ContainersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['containers-public'],
    queryFn: () => containerService.getAll(),
  });

  const containers = data?.data || [];
  const withCoords = containers.filter(c => c.latitude !== 0 && c.longitude !== 0);

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Conteneurs UpcycleConnect</h1>
          <p className="text-gray-500 mt-2">
            {containers.length} conteneur{containers.length > 1 ? 's' : ''} disponible{containers.length > 1 ? 's' : ''} à Paris
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Map */}
            <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm h-[500px]">
              {withCoords.length > 0 ? (
                <MapContainer
                  center={[48.8600, 2.3700]}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {withCoords.map((container) => (
                    <Marker
                      key={container.id}
                      position={[container.latitude, container.longitude]}
                    >
                      <Popup>
                        <div className="min-w-[180px]">
                          <p className="font-semibold text-gray-900 mb-1">{container.name}</p>
                          <p className="text-xs text-gray-500 mb-2">{container.address}, {container.district}</p>
                          <p className="text-xs">
                            <span className={clsx(
                              'px-2 py-0.5 rounded-full font-medium text-xs',
                              container.status === 'operational' ? 'bg-green-100 text-green-700' :
                              container.status === 'full' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            )}>
                              {statusLabel[container.status] || container.status}
                            </span>
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            Remplissage : {container.current_count}/{container.capacity}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50">
                  <div className="text-center">
                    <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Coordonnées GPS non disponibles</p>
                  </div>
                </div>
              )}
            </div>

            {/* List */}
            <div className="space-y-4 overflow-y-auto max-h-[500px] pr-1">
              {containers.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">Aucun conteneur disponible</p>
                </div>
              ) : (
                containers.map((container) => {
                  const fill = Math.round((container.current_count / container.capacity) * 100);
                  return (
                    <div key={container.id} className="card">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{container.name}</h3>
                          <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{container.address}, {container.district}</span>
                          </div>
                        </div>
                        <span className={clsx('badge', statusClass[container.status] || 'badge-gray')}>
                          {statusLabel[container.status] || container.status}
                        </span>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Remplissage</span>
                          <span>{container.current_count}/{container.capacity} objets</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className={clsx(
                              'h-2 rounded-full transition-all',
                              fill >= 90 ? 'bg-red-500' : fill >= 70 ? 'bg-amber-500' : 'bg-primary-500'
                            )}
                            style={{ width: `${Math.min(100, fill)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
