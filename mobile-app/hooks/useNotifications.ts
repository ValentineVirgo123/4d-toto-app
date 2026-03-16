/**
 * Expo Push Notification Hook
 * 1. Gets Expo push token and registers it with the backend
 * 2. Listens for foreground notifications
 * 3. Polls backend every 60s as fallback for local scheduling
 */
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const API_BASE = 'https://nonvascular-martina-nonfacetiously.ngrok-free.dev';
const API      = `${API_BASE}/api/tickets`;
const HEADERS  = { 'ngrok-skip-browser-warning': 'true', 'Content-Type': 'application/json' };

// Configure how notifications appear when app is in foreground
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
  const notifListener  = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    registerAndSaveToken();

    // Foreground notification listener
    notifListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('[notify] Received:', notification);
    });

    // User tapped a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[notify] Tapped:', response);
    });

    // Fallback polling (works while app is open)
    const interval = setInterval(pollForNotifications, 60000);
    pollForNotifications();

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
      clearInterval(interval);
    };
  }, []);
}

async function registerAndSaveToken() {
  try {
    // Set up Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'SGLottery Results',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4a8fff',
      });
    }

    // Request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('[notify] Permission not granted');
      return;
    }

    // Get Expo push token (requires development build — not Expo Go)
    const projectId = Constants.expoConfig?.extra?.eas?.projectId
      ?? Constants.easConfig?.projectId;

    if (!projectId) {
      // Expected in Expo Go — push tokens require a development build
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;
    console.log('[notify] Push token:', token);

    // Save token to backend
    await fetch(`${API_BASE}/api/devices/register`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ token, platform: Platform.OS }),
    });
  } catch (err: any) {
    // Expected in Expo Go — silently ignore
    if (err?.message?.includes('Expo Go')) return;
    console.warn('[notify] Token registration failed:', err?.message);
  }
}

async function pollForNotifications() {
  try {
    const res     = await fetch(`${API}?limit=20`, { headers: HEADERS });
    const data    = await res.json();
    const tickets = data.tickets || [];

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
        trigger: null,
      });
    }
  } catch {
    // silent — non-critical
  }
}

/** Show an immediate local notification */
export async function showLocalNotification(title: string, body: string, data?: Record<string, unknown>) {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: data || {} },
    trigger: null,
  });
}
