'use client';

import { useSolanaNotification } from '@/hooks/useSolanaNotification';

function NotificationItem({ notification, onClose }: { 
  notification: { id: string; type: string; message: string }; 
  onClose: () => void;
}) {
  const typeStyles: Record<string, string> = {
    success: 'bg-emerald-500/90 border-emerald-400 text-white',
    error: 'bg-red-500/90 border-red-400 text-white',
    warning: 'bg-amber-500/90 border-amber-400 text-white',
    info: 'bg-blue-500/90 border-blue-400 text-white',
  };

  const icons: Record<string, string> = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  const icon = icons[notification.type] || 'ℹ';

  return (
    <div
      className={`
        ${typeStyles[notification.type] || typeStyles.info}
        backdrop-blur-md border-l-4 rounded-lg shadow-xl
        px-4 py-3 min-w-72 max-w-96
        animate-[slideInRight_0.3s_ease-out]
      `}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <span className="text-xl font-bold flex-shrink-0">{icon}</span>
        <p className="text-sm font-medium flex-1">{notification.message}</p>
        <button 
          onClick={onClose}
          className="text-white/80 hover:text-white transition-colors flex-shrink-0"
          aria-label="Close notification"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export function NotificationContainer() {
  const { notifications, removeNotification } = useSolanaNotification();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none">
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <NotificationItem 
            notification={notification} 
            onClose={() => removeNotification(notification.id)} 
          />
        </div>
      ))}
    </div>
  );
}
