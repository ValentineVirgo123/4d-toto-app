import { useState, useEffect, useCallback } from 'react';
import { BASE_URL } from '../services/api';

/**
 * Polls the backend every 60 s for unread draw result notifications.
 * Shows an in-app toast stack and fires browser push notifications for wins.
 */
export default function NotificationBanner() {
  const [toasts, setToasts] = useState([]);

  const authHeaders = () => {
    const t = localStorage.getItem('auth_token');
    return t ? { Authorization: `Bearer ${t}` } : {};
  };

  const markRead = useCallback(async (ticketId) => {
    try {
      await fetch(`${BASE_URL}/tickets/${ticketId}/mark-read`, {
        method: 'PATCH', headers: authHeaders(),
      });
    } catch { /* silent */ }
  }, []);

  const dismiss = useCallback((ticketId) => {
    setToasts(prev => prev.filter(n => n.ticketId !== ticketId));
    markRead(ticketId);
  }, [markRead]);

  // Request browser notification permission once
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Poll for unread notifications
  useEffect(() => {
    const check = async () => {
      try {
        const res  = await fetch(`${BASE_URL}/tickets?limit=50`, { headers: authHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        const unread = (data.tickets || [])
          .filter(t => t.notification && !t.notification.read)
          .map(t => ({ ticketId: t.id, ...t.notification }));

        if (unread.length > 0) {
          setToasts(unread);
          unread.filter(n => n.won).forEach(n => {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(n.title || '🎉 You won!', { body: n.body, icon: '/favicon.ico' });
            }
          });
        }
      } catch { /* silent */ }
    };

    check();
    const iv = setInterval(check, 60000);
    return () => clearInterval(iv);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="notif-stack">
      {toasts.map(n => (
        <div key={n.ticketId} className={`notif-toast ${n.won ? 'won' : 'info'}`}>
          <span className="notif-icon">{n.won ? '🎉' : '🎫'}</span>
          <div className="notif-body">
            <div className="notif-title">{n.title}</div>
            <div className="notif-text">{n.body}</div>
          </div>
          <button className="notif-close" onClick={() => dismiss(n.ticketId)}>✕</button>
        </div>
      ))}
    </div>
  );
}
