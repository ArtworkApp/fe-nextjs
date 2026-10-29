import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';

const redirect = vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); });
const cookies = vi.fn(async () => ({ toString: (): string => 'artwork_access=valid' }));
vi.mock('next/navigation', () => ({ redirect }));
vi.mock('next/headers', () => ({ cookies }));
vi.mock('../../components/SiteHeader', () => ({ SiteHeader: () => null }));

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:3001/api/v1');
  vi.stubGlobal('fetch', vi.fn());
  redirect.mockClear();
});

it('renders private profile only after a direct server verification', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ user: { id: '1', email: 'person@example.com', displayName: null, avatarUrl: null } }), { status: 200 }));
  const { default: DashboardPage } = await import('./page');
  const html = renderToStaticMarkup(await DashboardPage());
  expect(html).toContain('person@example.com');
  expect(fetch).toHaveBeenCalledWith('http://localhost:3001/api/v1/auth/me', expect.objectContaining({ cache: 'no-store' }));
});

it('redirects an unauthorized direct request before rendering private data', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 401 }));
  const { default: DashboardPage } = await import('./page');
  await expect(DashboardPage()).rejects.toThrow('REDIRECT:/login?next=%2Fdashboard');
});

it('shows retry state during a backend outage', async () => {
  vi.mocked(fetch).mockRejectedValue(new Error('offline'));
  const { default: DashboardPage } = await import('./page');
  const html = renderToStaticMarkup(await DashboardPage());
  expect(html).toContain('Unable to check your session');
  expect(html).toContain('Retry');
  expect(redirect).not.toHaveBeenCalled();
});
