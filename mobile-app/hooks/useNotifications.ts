/**
 * Expo Push Notification Hook
 * Registers device token, listens for incoming notifications,
 * and polls Firestore (via backend) for draw-result notifications.
 */
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const API = 'https://nonvascular-martina-nonfacetiously.ngrok-free.dev/api/tickets';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useNotifications() {
  const notifListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Request notification permissions
    registerForPushNotifications();

    // Listen for received notifications (foreground)
    notifListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('[notify] Received:', notification);
    });

    // Listen for user interaction with a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[notify] Tapped:', response);
    });

    // Poll backend every 60 seconds for result notifications
    const interval = setInterval(pollForNotifications, 60000);
    pollForNotifications(); // immediate first check

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
      clearInterval(interval);
    };
  }, []);
}

async function registerForPushNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'SGLottery Results',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#e53935',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[notify] Push notification permission not granted');
    return null;
  }

  return finalStatus;
}

async function pollForNotifications() {
  try {
    const res  = await fetch(`${API}?limit=20`, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
    });
    const data = await res.json();
    const tickets = data.tickets || [];

    // Find tickets with unread result notifications
    const unread = tickets.filter(
      (t: Record<string, unknown>) =>
        t.notification &&
        !(t.notification as Record<string, unknown>).read
    );

    for (const ticket of unread) {
      const n = ticket.notification as Record<string, unknown>;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: n.title as string,
          body:  n.body  as string,
          data:  { ticketId: ticket.id, won: n.won },
          sound: n.won ? 'default' : undefined,
        },
        trigger: null, // immediate
      });
    }
  } catch {
    // silent — non-critical
  }
}

/** Show an immediate local notification (for after OCR completes) */
export async function showLocalNotification(title: string, body: string, data?: Record<string, unknown>) {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: data || {} },
    trigger: null,
  });
}
