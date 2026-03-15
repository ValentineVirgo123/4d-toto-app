import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTicketInteractor } from './useTicketInteractor';

// ── Mock the api module ───────────────────────────────────────────────────────

vi.mock('../services/api', () => ({
  api: {
    get:   vi.fn(),
    post:  vi.fn(),
    patch: vi.fn(),
  },
}));

import { api } from '../services/api';

const SAMPLE_TICKETS = [
  { id: 'abc1', gameType: '4D',  numbers: ['1234'], betType: 'ordinary', uploadedAt: '2026-03-15T10:00:00Z' },
  { id: 'abc2', gameType: 'TOTO', numbers: ['5', '12', '23', '34', '40', '45'], betType: 'system', systemSize: 7, uploadedAt: '2026-03-14T10:00:00Z' },
];

beforeEach(() => {
  vi.clearAllMocks();
});

// ── fetchTickets ──────────────────────────────────────────────────────────────

describe('fetchTickets', () => {
  it('populates tickets on success', async () => {
    api.get.mockResolvedValue({ tickets: SAMPLE_TICKETS });

    const { result } = renderHook(() => useTicketInteractor());

    await act(async () => { await result.current.fetchTickets(); });

    expect(result.current.tickets).toHaveLength(2);
    expect(result.current.tickets[0].id).toBe('abc1');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('uses the correct API path with default limit', async () => {
    api.get.mockResolvedValue({ tickets: [] });

    const { result } = renderHook(() => useTicketInteractor());
    await act(async () => { await result.current.fetchTickets(); });

    expect(api.get).toHaveBeenCalledWith('/tickets?limit=50');
  });

  it('respects a custom limit argument', async () => {
    api.get.mockResolvedValue({ tickets: [] });

    const { result } = renderHook(() => useTicketInteractor());
    await act(async () => { await result.current.fetchTickets(5); });

    expect(api.get).toHaveBeenCalledWith('/tickets?limit=5');
  });

  it('sets error state on API failure', async () => {
    api.get.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useTicketInteractor());
    await act(async () => { await result.current.fetchTickets(); });

    expect(result.current.error).toBe('Network error');
    expect(result.current.tickets).toHaveLength(0);
  });

  it('handles missing tickets field gracefully (empty array)', async () => {
    api.get.mockResolvedValue({});

    const { result } = renderHook(() => useTicketInteractor());
    await act(async () => { await result.current.fetchTickets(); });

    expect(result.current.tickets).toEqual([]);
  });

  it('sets loading true during fetch and false after', async () => {
    let resolve;
    api.get.mockReturnValue(new Promise(r => { resolve = r; }));

    const { result } = renderHook(() => useTicketInteractor());

    act(() => { result.current.fetchTickets(); });
    expect(result.current.loading).toBe(true);

    await act(async () => { resolve({ tickets: [] }); });
    expect(result.current.loading).toBe(false);
  });
});

// ── checkResult ───────────────────────────────────────────────────────────────

describe('checkResult', () => {
  it('calls the correct endpoint', async () => {
    api.post.mockResolvedValue({});
    api.get.mockResolvedValue({ tickets: [] });

    const { result } = renderHook(() => useTicketInteractor());
    await act(async () => { await result.current.checkResult('abc1'); });

    expect(api.post).toHaveBeenCalledWith('/results/check/abc1', {});
  });

  it('refreshes the ticket list after checking', async () => {
    api.post.mockResolvedValue({});
    api.get.mockResolvedValue({ tickets: SAMPLE_TICKETS });

    const { result } = renderHook(() => useTicketInteractor());
    await act(async () => { await result.current.checkResult('abc1'); });

    // fetchTickets should have been called via api.get
    expect(api.get).toHaveBeenCalledWith('/tickets?limit=50');
  });
});

// ── markNotificationRead ──────────────────────────────────────────────────────

describe('markNotificationRead', () => {
  it('calls PATCH on the correct endpoint', async () => {
    api.patch.mockResolvedValue({});

    const { result } = renderHook(() => useTicketInteractor());
    await act(async () => { await result.current.markNotificationRead('abc1'); });

    expect(api.patch).toHaveBeenCalledWith('/tickets/abc1/notification/read', {});
  });
});
