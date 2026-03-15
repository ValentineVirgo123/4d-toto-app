import { useState, useCallback } from 'react';
import { api, BASE_URL } from '../services/api';

export function useTicketInteractor() {
  const [tickets,    setTickets]    = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);

  const fetchTickets = useCallback(async (limit = 50) => {
    setLoading(true); setError(null);
    try {
      const data = await api.get(`/tickets?limit=${limit}`);
      setTickets(data.tickets ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkResult = useCallback(async (ticketId) => {
    try {
      await api.post(`/results/check/${ticketId}`, {});
      await fetchTickets();
    } catch { /* silent */ }
  }, [fetchTickets]);

  const markNotificationRead = useCallback(async (ticketId) => {
    try { await api.patch(`/tickets/${ticketId}/notification/read`, {}); } catch { /* silent */ }
  }, []);

  return { tickets, loading, error, fetchTickets, checkResult, markNotificationRead };
}
