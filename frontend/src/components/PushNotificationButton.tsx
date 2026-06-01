import { Bell, BellOff } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';

export default function PushNotificationButton() {
  const { isSupported, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) return null;

  return (
    <button
      onClick={isSubscribed ? unsubscribe : subscribe}
      disabled={isLoading}
      title={isSubscribed ? 'Désactiver les notifications push' : 'Activer les notifications push'}
      className={`p-2 rounded-lg transition-colors ${
        isSubscribed
          ? 'text-green-600 bg-green-50 hover:bg-green-100'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
      }`}
    >
      {isSubscribed ? <Bell size={18} /> : <BellOff size={18} />}
    </button>
  );
}
