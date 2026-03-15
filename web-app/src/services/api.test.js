import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, BASE_URL } from './api';

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockFetch(body, ok = true, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

// ── BASE_URL ──────────────────────────────────────────────────────────────────

describe('BASE_URL', () => {
  it('defaults to localhost:3001/api', () => {
    expect(BASE_URL).toBe('http://localhost:3001/api');
  });
});

// ── api.get ───────────────────────────────────────────────────────────────────

describe('api.get', () => {
  it('calls the correct URL with GET method', async () => {
    mockFetch({ tickets: [] });
    await api.get('/tickets');
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/tickets',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('returns parsed JSON on success', async () => {
    const payload = { tickets: [{ id: '1', gameType: '4D' }] };
    mockFetch(payload);
    const result = await api.get('/tickets');
    expect(result).toEqual(payload);
  });

  it('throws with the server error message on non-ok response', async () => {
    mockFetch({ error: 'Not found' }, false, 404);
    await expect(api.get('/tickets/bad-id')).rejects.toThrow('Not found');
  });

  it('falls back to HTTP status in error message when no error field', async () => {
    mockFetch({}, false, 500);
    await expect(api.get('/tickets')).rejects.toThrow('HTTP 500');
  });
});

// ── api.post ──────────────────────────────────────────────────────────────────

describe('api.post', () => {
  it('calls the correct URL with POST method and JSON body', async () => {
    mockFetch({ success: true });
    await api.post('/results/check/abc123', {});
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/results/check/abc123',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
  });

  it('serialises the body to JSON', async () => {
    mockFetch({ ok: true });
    await api.post('/results/scrape', { force: true });
    const call = fetch.mock.calls[0][1];
    expect(JSON.parse(call.body)).toEqual({ force: true });
  });

  it('throws on non-ok response', async () => {
    mockFetch({ error: 'Forbidden' }, false, 403);
    await expect(api.post('/results/scrape', {})).rejects.toThrow('Forbidden');
  });
});

// ── api.patch ─────────────────────────────────────────────────────────────────

describe('api.patch', () => {
  it('calls the correct URL with PATCH method', async () => {
    mockFetch({ ok: true });
    await api.patch('/tickets/abc123/notification/read', {});
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/tickets/abc123/notification/read',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});

// ── api.postForm ──────────────────────────────────────────────────────────────

describe('api.postForm', () => {
  it('sends a FormData body without Content-Type header (browser sets boundary)', async () => {
    mockFetch({ ticket: { id: '1' } });
    const form = new FormData();
    form.append('ticket', new Blob(['img'], { type: 'image/jpeg' }), 'ticket.jpg');
    await api.postForm('/tickets/upload', form);
    const call = fetch.mock.calls[0][1];
    expect(call.body).toBeInstanceOf(FormData);
    expect(call.headers?.['Content-Type']).toBeUndefined();
  });
});
