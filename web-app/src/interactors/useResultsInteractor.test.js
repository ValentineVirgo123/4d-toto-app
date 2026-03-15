import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useResultsInteractor } from './useResultsInteractor';

vi.mock('../services/api', () => ({
  api: {
    get:  vi.fn(),
    post: vi.fn(),
  },
}));

import { api } from '../services/api';

const SAMPLE_4D = [
  { drawDate: '2026-03-13', first: '1234', second: '5678', third: '9012', starters: [], consolation: [], source: 'mock' },
];
const SAMPLE_TOTO = [
  { drawDate: '2026-03-13', winningNums: [3, 11, 22, 30, 41, 45], addlNum: 7, jackpot: '$2,000,000', source: 'mock' },
];

beforeEach(() => vi.clearAllMocks());

describe('fetch4D', () => {
  it('populates fourdResults on success', async () => {
    api.get.mockResolvedValue({ results: SAMPLE_4D });

    const { result } = renderHook(() => useResultsInteractor());

    act(() => { result.current.fetch4D(); });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.fourdResults).toHaveLength(1);
    expect(result.current.fourdResults[0].first).toBe('1234');
    expect(result.current.error).toBeNull();
  });

  it('accepts a single result object (result field instead of results)', async () => {
    api.get.mockResolvedValue({ result: SAMPLE_4D[0] });

    const { result } = renderHook(() => useResultsInteractor());

    act(() => { result.current.fetch4D(); });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.fourdResults).toHaveLength(1);
  });

  it('calls the correct endpoint with default limit', async () => {
    api.get.mockResolvedValue({ results: [] });

    const { result } = renderHook(() => useResultsInteractor());
    await act(async () => { await result.current.fetch4D(); });

    expect(api.get).toHaveBeenCalledWith('/results/4d?limit=20');
  });

  it('sets error on failure', async () => {
    api.get.mockRejectedValue(new Error('Scraper down'));

    const { result } = renderHook(() => useResultsInteractor());

    act(() => { result.current.fetch4D(); });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Scraper down');
  });
});

describe('fetchTOTO', () => {
  it('populates totoResults on success', async () => {
    api.get.mockResolvedValue({ results: SAMPLE_TOTO });

    const { result } = renderHook(() => useResultsInteractor());

    act(() => { result.current.fetchTOTO(); });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.totoResults).toHaveLength(1);
    expect(result.current.totoResults[0].winningNums).toContain(3);
  });

  it('calls the correct endpoint', async () => {
    api.get.mockResolvedValue({ results: [] });

    const { result } = renderHook(() => useResultsInteractor());
    await act(async () => { await result.current.fetchTOTO(); });

    expect(api.get).toHaveBeenCalledWith('/results/toto?limit=20');
  });
});

describe('scrapeLatest', () => {
  it('calls POST /results/scrape', async () => {
    api.post.mockResolvedValue({});

    const { result } = renderHook(() => useResultsInteractor());
    await act(async () => { await result.current.scrapeLatest(); });

    expect(api.post).toHaveBeenCalledWith('/results/scrape', {});
  });

  it('does not throw if scrape fails (silent)', async () => {
    api.post.mockRejectedValue(new Error('Site unreachable'));

    const { result } = renderHook(() => useResultsInteractor());
    await expect(act(async () => { await result.current.scrapeLatest(); })).resolves.not.toThrow();
  });
});
