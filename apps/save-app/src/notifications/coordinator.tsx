import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';

import { setLogoutCleanup } from '@/auth/logout-cleanup';
import { registerForPushNotifications, unregisterCurrentPushToken } from './registration';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type NotificationDestination =
  | { pathname: '/chats/[id]'; params: { id: string } }
  | { pathname: '/rentals/[id]'; params: { id: string } };

function positiveId(value: unknown): string | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? String(value)
    : null;
}

export function notificationRoute(data: unknown): NotificationDestination | null {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null;
  const payload = data as Record<string, unknown>;
  if (payload.type === 'CHAT_MESSAGE') {
    const id = positiveId(payload.roomId);
    return id ? { pathname: '/chats/[id]', params: { id } } : null;
  }
  if (payload.type === 'RENTAL_REQUESTED'
    || payload.type === 'RENTAL_APPROVED'
    || payload.type === 'RENTAL_REJECTED'
    || payload.type === 'REVIEW_PUBLISHED') {
    const id = positiveId(payload.rentalId);
    return id ? { pathname: '/rentals/[id]', params: { id } } : null;
  }
  return null;
}

export function NotificationCoordinator({ accessToken }: { accessToken: string }) {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    let removePushTokenListener: (() => void) | undefined;
    const removeLogoutCleanup = setLogoutCleanup(unregisterCurrentPushToken);

    void registerForPushNotifications(accessToken)
      .then(registration => {
        if (!registration) return;
        if (!active) {
          registration.remove();
          return;
        }
        removePushTokenListener = registration.remove;
      })
      .catch(() => undefined);

    const routeResponse = (response: Notifications.NotificationResponse | null) => {
      const destination = notificationRoute(response?.notification.request.content.data);
      if (destination) router.push(destination);
    };

    routeResponse(Notifications.getLastNotificationResponse());
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(routeResponse);

    return () => {
      active = false;
      removePushTokenListener?.();
      removeLogoutCleanup();
      responseSubscription.remove();
    };
  }, [accessToken, router]);

  return null;
}
