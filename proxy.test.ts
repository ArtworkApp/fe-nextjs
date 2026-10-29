import { NextRequest } from 'next/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { config, proxy } from './proxy';

const web = 'http://localhost:3000';
const api = 'http://localhost:3001/api/v1/auth';
const profile = { id: 'user-1', email: 'person@example.com', displayName: null, avatarUrl: null };

function request(path: string, cookie = ''): NextRequest {
  return new NextRequest(`${web}${path}`, { headers: cookie ? { cookie } : {} });
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:3001/api/v1');
  vi.stubEnv('AUTH_COOKIE_DOMAIN', '');
  vi.stubGlobal('fetch', vi.fn());
});

it('matches private paths only and accepts a verified access cookie', async () => {
  expect(config.matcher).toEqual(['/dashboard/:path*']);
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ user: profile }), { status: 200 }));
  const result = await proxy(request('/dashboard/gallery?sort=new', 'artwork_access=valid'));
  expect(result.status).toBe(200);
  expect(result.headers.get('location')).toBeNull();
  expect(fetch).toHaveBeenCalledWith(`${api}/me`, expect.objectContaining({
    headers: expect.objectContaining({ Cookie: 'artwork_access=valid' }), cache: 'no-store',
  }));
});

it('refreshes once, forwards both rotated cookies to the browser and page, and verifies again', async () => {
  const refreshHeaders = new Headers();
  refreshHeaders.append('Set-Cookie', 'artwork_access=new-access; Path=/; HttpOnly; SameSite=Lax');
  refreshHeaders.append('Set-Cookie', 'artwork_refresh=new-refresh; Path=/; HttpOnly; SameSite=Lax');
  vi.mocked(fetch)
    .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: 'UNAUTHENTICATED' } }), { status: 401 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ user: profile }), { status: 200, headers: refreshHeaders }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ user: profile }), { status: 200 }));
  const result = await proxy(request('/dashboard/gallery?sort=new', 'artwork_access=expired; artwork_refresh=old-refresh'));
  expect(result.status).toBe(200);
  expect(fetch).toHaveBeenNthCalledWith(2, `${api}/refresh`, expect.objectContaining({
    method: 'POST', body: '{}', headers: expect.objectContaining({ Origin: web, 'Content-Type': 'application/json', Cookie: 'artwork_refresh=old-refresh' }),
  }));
  expect(fetch).toHaveBeenNthCalledWith(3, `${api}/me`, expect.objectContaining({
    headers: expect.objectContaining({ Cookie: 'artwork_access=new-access; artwork_refresh=new-refresh' }),
  }));
  expect(result.headers.get('set-cookie')).toContain('artwork_access=new-access');
  expect(result.headers.get('set-cookie')).toContain('artwork_refresh=new-refresh');
  expect(result.headers.get('x-middleware-request-cookie')).toBe('artwork_access=new-access; artwork_refresh=new-refresh');
});

it.each([
  ['', '/dashboard'],
  ['artwork_access=bad; artwork_refresh=bad', '/dashboard/gallery?sort=new'],
])('redirects anonymous requests and clears stale cookies (%s)', async (cookie, path) => {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ error: { code: 'SESSION_EXPIRED' } }), { status: 401 }));
  const result = await proxy(request(path, cookie));
  expect(result.status).toBe(307);
  expect(result.headers.get('location')).toBe(`${web}/login?next=${encodeURIComponent(path)}`);
  expect(result.headers.get('set-cookie')).toContain('artwork_access=');
  expect(result.headers.get('set-cookie')).toContain('artwork_refresh=');
});

it('renders an error route for a backend outage without clearing cookies', async () => {
  vi.mocked(fetch).mockRejectedValue(new Error('offline'));
  const result = await proxy(request('/dashboard', 'artwork_access=valid'));
  expect(result.headers.get('x-middleware-rewrite')).toBe(`${web}/session-unavailable?next=%2Fdashboard`);
  expect(result.headers.get('set-cookie')).toBeNull();
});

it('treats a malformed auth cookie as anonymous without attempting refresh', async () => {
  const result = await proxy(request('/dashboard', 'artwork_access=bad%0Avalue; artwork_refresh=valid-refresh'));
  expect(result.headers.get('location')).toBe(`${web}/login?next=%2Fdashboard`);
  expect(fetch).not.toHaveBeenCalled();
});

it('does not render a page when the rotated access token fails verification', async () => {
  const headers = new Headers();
  headers.append('Set-Cookie', 'artwork_access=revoked; Path=/; HttpOnly');
  headers.append('Set-Cookie', 'artwork_refresh=rotated; Path=/; HttpOnly');
  vi.mocked(fetch)
    .mockResolvedValueOnce(new Response('{}', { status: 401 }))
    .mockResolvedValueOnce(new Response('{}', { status: 200, headers }))
    .mockResolvedValueOnce(new Response('{}', { status: 401 }));
  const result = await proxy(request('/dashboard', 'artwork_access=expired; artwork_refresh=old'));
  expect(result.headers.get('location')).toBe(`${web}/login?next=%2Fdashboard`);
  expect(fetch).toHaveBeenCalledTimes(3);
});

it('keeps cookies during a refresh outage', async () => {
  vi.mocked(fetch)
    .mockResolvedValueOnce(new Response('{}', { status: 401 }))
    .mockResolvedValueOnce(new Response('{}', { status: 503 }));
  const result = await proxy(request('/dashboard', 'artwork_access=expired; artwork_refresh=old'));
  expect(result.headers.get('x-middleware-rewrite')).toContain('/session-unavailable');
  expect(result.headers.get('set-cookie')).toBeNull();
});

it('uses the configured shared domain when clearing production cookies', async () => {
  vi.stubEnv('AUTH_COOKIE_DOMAIN', '.example.com');
  vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 401 }));
  const result = await proxy(request('/dashboard', 'artwork_access=revoked'));
  expect(result.headers.get('set-cookie')).toContain('Domain=.example.com');
});
