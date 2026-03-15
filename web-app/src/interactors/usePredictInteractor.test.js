import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePredictInteractor } from './usePredictInteractor';

vi.mock('../services/api', () => ({
  api: { get: vi.fn() },
}));

import { api } from '../services/api';

const SAMPLE_PREDICTIONS = [
  {
    model: 'Frequency Analysis', modelId: 'frequency',
    predicted4D: '4827', predictedTOTO: [3, 11, 15, 22, 30, 41, 5, 9, 18, 27, 38, 44],
    why: 'test', assumptions: 'test', methodology: 'test',
    evaluation: 'test', confidence: 'test', disclaimer: 'test',
    confidenceScore: 0.14,
  },
];

beforeEach(() => vi.clearAllMocks());

describe('fetchPredictions', () => {
  it('populates predictions on success', async () => {
    api.get.mockResolvedValue({
      predictions: SAMPLE_PREDICTIONS,
      dataPoints: { fourd: 50, toto: 100 },
      generatedAt: '2026-03-15T12:00:00Z',
    });

    const { result } = renderHook(() => usePredictInteractor());
    await act(async () => { await result.current.fetchPredictions(); });

    expect(result.current.predictions).toHaveLength(1);
    expect(result.current.predictions[0].predicted4D).toBe('4827');
    expect(result.current.predictions[0].predictedTOTO).toHaveLength(12);
  });

  it('sets meta dataPoints and generatedAt', async () => {
    api.get.mockResolvedValue({
      predictions: SAMPLE_PREDICTIONS,
      dataPoints: { fourd: 50, toto: 100 },
      generatedAt: '2026-03-15T12:00:00Z',
    });

    const { result } = renderHook(() => usePredictInteractor());
    await act(async () => { await result.current.fetchPredictions(); });

    expect(result.current.meta.dataPoints.fourd).toBe(50);
    expect(result.current.meta.generatedAt).toBe('2026-03-15T12:00:00Z');
  });

  it('calls GET /predict', async () => {
    api.get.mockResolvedValue({ predictions: [], dataPoints: { fourd: 0, toto: 0 }, generatedAt: '' });

    const { result } = renderHook(() => usePredictInteractor());
    await act(async () => { await result.current.fetchPredictions(); });

    expect(api.get).toHaveBeenCalledWith('/predict');
  });

  it('sets error on failure', async () => {
    api.get.mockRejectedValue(new Error('Model failed'));

    const { result } = renderHook(() => usePredictInteractor());
    await act(async () => { await result.current.fetchPredictions(); });

    expect(result.current.error).toBe('Model failed');
    expect(result.current.predictions).toEqual([]);
  });

  it('handles empty predictions array gracefully', async () => {
    api.get.mockResolvedValue({ predictions: [], dataPoints: { fourd: 0, toto: 0 }, generatedAt: '' });

    const { result } = renderHook(() => usePredictInteractor());
    await act(async () => { await result.current.fetchPredictions(); });

    expect(result.current.predictions).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});
