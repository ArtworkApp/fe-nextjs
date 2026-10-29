import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { SessionProvider, useSession } from './SessionProvider';

const user = { id: 'user-1', email: 'person@example.com', displayName: null, avatarUrl: null };
function View() {
  const { state, user: currentUser } = useSession();
  return <p>{state}: {currentUser?.email}</p>;
}
function SignOutView() {
  const { state, signOut, signOutWarning } = useSession();
  return <><p>{state}</p><p>{signOutWarning}</p><button onClick={() => void signOut()}>Sign out</button></>;
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:3001/api/v1');
});

it('refreshes an expired access cookie once and confirms the session', async () => {
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce({ ok: false, status: 401 })
    .mockResolvedValueOnce({ ok: true })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ user }) }));
  render(<SessionProvider><View /></SessionProvider>);
  expect(await screen.findByText('authenticated: person@example.com')).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(fetch).toHaveBeenNthCalledWith(2, 'http://localhost:3001/api/v1/auth/refresh', expect.objectContaining({ method: 'POST', credentials: 'include' }));
});

it('does not render an authenticated state after refresh fails', async () => {
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce({ ok: false, status: 401 })
    .mockResolvedValueOnce({ ok: false, status: 401 }));
  render(<SessionProvider><View /></SessionProvider>);
  await waitFor(() => expect(screen.getByText('anonymous:')).toBeInTheDocument());
  expect(fetch).toHaveBeenCalledTimes(2);
});

it('posts cookie logout and clears the local session', async () => {
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ user }) })
    .mockResolvedValueOnce({ ok: true, status: 204 }));
  render(<SessionProvider><SignOutView /></SessionProvider>);
  await screen.findByText('authenticated');
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  await screen.findByText('anonymous');
  expect(fetch).toHaveBeenNthCalledWith(2, 'http://localhost:3001/api/v1/auth/logout', expect.objectContaining({
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}',
  }));
});

it('treats an expired server session as a completed sign-out', async () => {
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ user }) })
    .mockResolvedValueOnce({ ok: false, status: 401 }));
  render(<SessionProvider><SignOutView /></SessionProvider>);
  await screen.findByText('authenticated');
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  await screen.findByText('anonymous');
  expect(screen.queryByText('Could not confirm sign-out with the server.')).not.toBeInTheDocument();
});

it('keeps a revocation warning after a failed logout request', async () => {
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ user }) })
    .mockRejectedValueOnce(new Error('offline')));
  render(<SessionProvider><SignOutView /></SessionProvider>);
  await screen.findByText('authenticated');
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  await screen.findByText('anonymous');
  expect(await screen.findByText('Could not confirm sign-out with the server.')).toBeInTheDocument();
});
