import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { api, BASE_URL } from '../services/api';
import type { Ticket, OcrResult } from '../entities/Ticket';

export function useTicketInteractor() {
  const [tickets,    setTickets]    = useState<Ticket[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const fetchTickets = useCallback(async (limit = 50) => {
    setLoading(true); setError(null);
    try {
      const data = await api.get<{ tickets: Ticket[] }>(`/tickets?limit=${limit}`);
      setTickets(data.tickets ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await api.get<{ tickets: Ticket[] }>('/tickets?limit=50');
      setTickets(data.tickets ?? []);
    } catch { /* silent */ }
    finally { setRefreshing(false); }
  }, []);

  /** Upload with a 90-second timeout (OCR can be slow) */
  const uploadTicket = useCallback(async (uri: string): Promise<OcrResult> => {
    const form = new FormData();
    form.append('ticket', { uri, type: 'image/jpeg', name: 'ticket.jpg' } as unknown as Blob);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90_000);
    try {
      const res = await fetch(`${BASE_URL}/tickets/upload`, {
        method: 'POST',
        body: form,
        signal: controller.signal,
        headers: { 'ngrok-skip-browser-warning': 'true' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Server error');
      return data as OcrResult;
    } finally {
      clearTimeout(timer);
    }
  }, []);

  const takePhoto = useCallback(async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to take a ticket photo.');
      return null;
    }
    const photo = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    return photo.canceled ? null : photo.assets[0].uri;
  }, []);

  const pickImage = useCallback(async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Gallery access is needed to select a photo.');
      return null;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    return picked.canceled ? null : picked.assets[0].uri;
  }, []);

  const checkResult = useCallback(async (ticketId: string) =>
    api.post<{ ticket: Ticket }>(`/results/check/${ticketId}`, {}),
  []);

  const markNotificationRead = useCallback(async (ticketId: string) =>
    api.patch(`/tickets/${ticketId}/notification/read`, {}),
  []);

  const deleteTicket = useCallback(async (ticketId: string) => {
    try {
      await api.delete(`/tickets/${ticketId}`);
      setTickets(prev => prev.filter(t => t.id !== ticketId));
    } catch (err) {
      Alert.alert('Delete Failed', (err as Error).message || 'Could not delete ticket.');
    }
  }, []);

  return {
    tickets, loading, refreshing, error,
    fetchTickets, refresh,
    uploadTicket, takePhoto, pickImage,
    checkResult, markNotificationRead,
    deleteTicket,
  };
}
