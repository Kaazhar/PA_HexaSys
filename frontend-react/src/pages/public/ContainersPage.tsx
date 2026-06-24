import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Package, Box, X, Layers } from 'lucide-react';
import PublicLayout from '../../components/layout/PublicLayout';
import { useQuery } from '@tanstack/react-query';
import { containerService } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import type { Container, ContainerSlot } from '../../types';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const statusClass: Record<string, string> = {
  operational: 'badge-green',
  full: 'badge-red',
  maintenance: 'badge-yellow',
};

export default function ContainersPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isPro = user?.role === 'professionnel';
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);

  const statusLabel: Record<string, string> = {
    operational: t('containers.available'),
    full: t('containers.full_label'),
    maintenance: t('containers.maintenance_label'),
  };
  const { data, isLoading } = useQuery({
    queryKey: ['containers-public'],
    queryFn: () => containerService.getAll(),
  });

  const { data: availableData } = useQuery({
    queryKey: ['containers-available-objects'],
    queryFn: () => containerService.getAvailableObjects(),
    enabled: isPro,
  });

  const containers = data?.data || [];
  const withCoords = containers.filter(c => c.latitude !== 0 && c.longitude !== 0);
  const availableObjects = availableData?.data || [];

  const { data: slotsData } = useQuery({
    queryKey: ['container-slots', selectedContainer?.id],
    queryFn: () => containerService.getSlots(selectedContainer!.id),
    enabled: !!selectedContainer,
  });
  const slots: ContainerSlot[] = slotsData?.data || [];

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('containers.page_title')}</h1>
          <p className="text-gray-500 mt-2">
            {t(containers.length > 1 ? 'containers.count_plural' : 'containers.count', { count: containers.length })}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
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
                            {t('containers.fill')} : {container.current_count}/{container.capacity}
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
                    <p>{t('containers.no_coords')}</p>
                  </div>
                </div>
              )}
            </div>

            
            <div className="space-y-4 overflow-y-auto max-h-[500px] pr-1">
              {containers.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">{t('containers.none')}</p>
                </div>
              ) : (
                containers.map((container) => {
                  const fill = Math.round((container.current_count / container.capacity) * 100);
                  return (
                    <div
                      key={container.id}
                      className="card cursor-pointer hover:shadow-md hover:border-primary-300 border border-transparent transition-all"
                      onClick={() => setSelectedContainer(container)}
                    >
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
                          <span>{t('containers.fill')}</span>
                          <span>{container.current_count}/{container.capacity} {t('containers.objects')}</span>
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
                      <p className="text-xs text-primary-600 mt-3 font-medium">{t('containers.see_slots')}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
        
        {isPro && (
          <div className="mt-10">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Box className="w-5 h-5 text-primary-600" />
              Objets disponibles à récupérer
            </h2>
            {availableObjects.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Aucun objet disponible pour le moment.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableObjects.map((obj) => (
                  <div key={obj.slot_id} className="card hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{obj.object_title}</h3>
                      <span className={clsx(
                        'text-xs font-bold px-2 py-0.5 rounded-full',
                        obj.size === 'S' ? 'bg-blue-100 text-blue-700' :
                        obj.size === 'M' ? 'bg-amber-100 text-amber-700' :
                        'bg-purple-100 text-purple-700'
                      )}>
                        {obj.size}
                      </span>
                    </div>
                    {obj.object_description && (
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">{obj.object_description}</p>
                    )}
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <MapPin className="w-3 h-3" />
                      <span>{obj.container_name} — {obj.address}, {obj.district}</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-400">
                      Emplacement : <span className="font-mono font-semibold text-gray-600">{obj.slot_code}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedContainer && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/40" onClick={() => setSelectedContainer(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary-600" />
                  {selectedContainer.name}
                </h2>
                <p className="text-sm text-gray-400 mt-0.5">{selectedContainer.address}, {selectedContainer.district}</p>
              </div>
              <button onClick={() => setSelectedContainer(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              {slots.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">{t('common.noData')}</p>
              ) : (
                <div className="space-y-4">
                  {(['S', 'M', 'L'] as const).map(size => {
                    const sizeSlots = slots.filter(s => s.size === size);
                    if (sizeSlots.length === 0) return null;
                    const free = sizeSlots.filter(s => s.status === 'free').length;
                    const occupied = sizeSlots.length - free;
                    return (
                      <div key={size}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={clsx(
                              'text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center',
                              size === 'S' ? 'bg-blue-100 text-blue-700' :
                              size === 'M' ? 'bg-amber-100 text-amber-700' :
                              'bg-purple-100 text-purple-700'
                            )}>{size}</span>
                            <span className="text-sm font-medium text-gray-700">{t(`containers.size_${size.toLowerCase()}`)}</span>
                          </div>
                          <span className="text-xs text-gray-400">{free} {t('containers.free')} / {sizeSlots.length} {t('containers.total')}</span>
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {sizeSlots.map(slot => (
                            <span
                              key={slot.id}
                              title={slot.slot_code}
                              className={clsx(
                                'text-xs px-2 py-0.5 rounded font-mono',
                                slot.status === 'free' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500 line-through'
                              )}
                            >
                              {slot.slot_code}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-3 border-t border-gray-100 flex justify-between text-sm">
                    <span className="text-gray-500">{t('containers.fill')}</span>
                    <span className="font-semibold text-gray-900">
                      {slots.filter(s => s.status !== 'free').length}/{slots.length} {t('containers.objects')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PublicLayout>
  );
}
