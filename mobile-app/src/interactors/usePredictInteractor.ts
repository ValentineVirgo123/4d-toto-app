import { useState, useCallback } from 'react';
import { api } from '../services/api';
import type { Prediction, PredictMeta } from '../entities/Prediction';

export function usePredictInteractor() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [meta,        setMeta]        = useState<PredictMeta | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const fetchPredictions = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await api.get<{
        predictions: Prediction[];
        dataPoints:  PredictMeta['dataPoints'];
        generatedAt: string;
      }>('/predict');
      setPredictions(data.predictions ?? []);
      if (data.dataPoints) {
        setMeta({ dataPoints: data.dataPoints, generatedAt: data.generatedAt });
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { predictions, meta, loading, error, fetchPredictions };
}
