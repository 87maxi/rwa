/**
 * Solana Notification Hook
 * 
 * Provides toast-like notifications for wallet and transaction events.
 */

import { useState, useCallback } from 'react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

const NOTIFICATION_DURATION = 5000;

export function useSolanaNotification() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const showNotification = useCallback(
    (type: NotificationType, message: string, duration = NOTIFICATION_DURATION) => {
      const id = Math.random().toString(36).substring(7);
      const newNotification: Notification = { id, type, message, duration };

      setNotifications((prev) => [...prev, newNotification]);

      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, duration);
      }
    },
    [removeNotification]
  );

  // Convenience methods
  const success = useCallback((message: string) => showNotification('success', message), [showNotification]);
  const error = useCallback((message: string) => showNotification('error', message), [showNotification]);
  const warning = useCallback((message: string) => showNotification('warning', message), [showNotification]);
  const info = useCallback((message: string) => showNotification('info', message), [showNotification]);

  return {
    notifications,
    showNotification,
    success,
    error,
    warning,
    info,
    removeNotification,
  };
}

/**
 * Hook to handle wallet connection errors
 */
export function useWalletErrorHandling(onError?: (message: string) => void) {
  const handleWalletError = useCallback(
    (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown wallet error';
      
      let userMessage = 'Wallet error occurred';
      
      if (message.includes('rejected')) {
        userMessage = 'Transaction rejected by user';
      } else if (message.includes('timeout')) {
        userMessage = 'Transaction timed out - please try again';
      } else if (message.includes('insufficient')) {
        userMessage = 'Insufficient SOL balance';
      } else if (message.includes('not found')) {
        userMessage = 'Wallet not found - please install a Solana wallet';
      }
      
      onError?.(userMessage);
      return userMessage;
    },
    [onError]
  );

  return handleWalletError;
}
