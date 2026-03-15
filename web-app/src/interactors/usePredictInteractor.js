import { useState, useCallback } from 'react';
import { api } from '../services/api';

export function usePredictInteractor() {
  const [predictions, setPredictions] = useState([]);
  const [meta,        setMeta]        = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);

  const fetchPredictions = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await api.get('/predict');
      setPredictions(data.predictions ?? []);
      if (data.dataPoints) setMeta({ dataPoints: data.dataPoints, generatedAt: data.generatedAt });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { predictions, meta, loading, error, fetchPredictions };
}
