import { useState, useCallback } from 'react';
import { api } from '../services/api';

export function useResultsInteractor() {
  const [fourdResults, setFourdResults] = useState([]);
  const [totoResults,  setTotoResults]  = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [searching,    setSearching]    = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);
  const [error,        setError]        = useState(null);

  // Default load: last 7 days
  const fetch4D = useCallback(async (days = 7) => {
    setLoading(true); setError(null);
    try {
      const data = await api.get(`/results/4d?days=${days}`);
      setFourdResults(data.results ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTOTO = useCallback(async (days = 7) => {
    setLoading(true); setError(null);
    try {
      const data = await api.get(`/results/toto?days=${days}`);
      setTotoResults(data.results ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Date search: fetch specific draw date
  const searchByDate = useCallback(async (game, date) => {
    setSearching(true); setError(null);
    try {
      const data = await api.get(`/results/${game}?date=${encodeURIComponent(date)}`);
      const results = data.results ?? [];
      if (game === '4d') setFourdResults(results);
      else               setTotoResults(results);
      return results.length > 0;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setSearching(false);
    }
  }, []);

  const scrapeLatest = useCallback(async () => {
    setRefreshing(true);
    try { await api.post('/results/scrape', {}); } catch { /* silent */ }
    finally { setRefreshing(false); }
  }, []);

  const lookupNumber = useCallback(async (game, params) => {
    const qs = new URLSearchParams({ game, date: params.date, ...(game === '4d' ? { number: params.number } : { numbers: params.numbers }) });
    return api.get(`/results/lookup?${qs}`);
  }, []);

  return { fourdResults, totoResults, loading, searching, refreshing, error, fetch4D, fetchTOTO, searchByDate, scrapeLatest, lookupNumber };
}
