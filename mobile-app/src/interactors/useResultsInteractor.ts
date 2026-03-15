import { useState, useCallback } from 'react';
import { api } from '../services/api';
import type { FourDResult, TOTOResult } from '../entities/DrawResult';

export function useResultsInteractor() {
  const [fourdResults, setFourdResults] = useState<FourDResult[]>([]);
  const [totoResults,  setTotoResults]  = useState<TOTOResult[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [searching,    setSearching]    = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  // Default load: last 7 days
  const fetch4D = useCallback(async (isRefresh = false, days = 7) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ results?: FourDResult[] }>(`/results/4d?days=${days}`);
      setFourdResults(data.results ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  const fetchTOTO = useCallback(async (isRefresh = false, days = 7) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ results?: TOTOResult[] }>(`/results/toto?days=${days}`);
      setTotoResults(data.results ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  // Date search: fetch specific draw date
  const searchByDate = useCallback(async (game: '4d' | 'toto', date: string): Promise<boolean> => {
    setSearching(true); setError(null);
    try {
      const data = await api.get<{ results?: FourDResult[] | TOTOResult[] }>(
        `/results/${game}?date=${encodeURIComponent(date)}`,
      );
      const results = data.results ?? [];
      if (game === '4d') setFourdResults(results as FourDResult[]);
      else               setTotoResults(results as TOTOResult[]);
      return results.length > 0;
    } catch (err) {
      setError((err as Error).message);
      return false;
    } finally {
      setSearching(false);
    }
  }, []);

  const scrapeLatest = useCallback(async () => {
    try { await api.post('/results/scrape', {}); } catch { /* silent */ }
  }, []);

  return { fourdResults, totoResults, loading, searching, refreshing, error, fetch4D, fetchTOTO, searchByDate, scrapeLatest };
}
