import { afterEach, describe, expect, it, vi } from 'vitest';
import { confirmPasswordReset, requestPasswordReset } from './passwordRecovery';

describe('password recovery API', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('normalizes an email and sends a reset request', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 202 });
    vi.stubGlobal('fetch', fetchMock);
    await expect(requestPasswordReset(' Person@Example.com ')).resolves.toBe('accepted');
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/password-reset/request', expect.objectContaining({
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'person@example.com' }),
    }));
  });

  it('submits only the token and new password', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal('fetch', fetchMock);
    await expect(confirmPasswordReset({ token: 'reset-token', password: 'new-password' })).resolves.toBe('confirmed');
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/password-reset/confirm', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ token: 'reset-token', password: 'new-password' }),
    }));
  });

  it('recognizes an invalid reset token without exposing server messages', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: { code: 'INVALID_RESET_TOKEN', message: 'sensitive detail' } }) }));
    await expect(confirmPasswordReset({ token: 'reset-token', password: 'new-password' })).resolves.toBe('invalid_token');
  });

  it('reports rate limits and network failures using safe outcomes', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, status: 429 }).mockRejectedValueOnce(new Error('network detail'));
    vi.stubGlobal('fetch', fetchMock);
    await expect(requestPasswordReset('person@example.com')).resolves.toBe('rate_limited');
    await expect(confirmPasswordReset({ token: 'reset-token', password: 'new-password' })).resolves.toBe('network_error');
  });

  it('treats unexpected server responses as a generic failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => { throw new Error('invalid JSON'); } }));
    await expect(requestPasswordReset('person@example.com')).resolves.toBe('failed');
  });
});
