import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { AccountLinks } from './AccountLinks';

const replace = vi.fn();
const signOut = vi.fn(async () => true);
const session = { state: 'authenticated', user: { id: '1', email: 'person@example.com', displayName: 'Alex', avatarUrl: null }, signOut };
vi.mock('./SessionProvider', () => ({ useSession: () => session }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }), useSearchParams: () => new URLSearchParams() }));

beforeEach(() => {
  replace.mockReset();
  signOut.mockReset().mockResolvedValue(true);
  session.state = 'authenticated';
});

it('shows a greeting and sign-out control after authentication', () => {
  render(<AccountLinks currentPath="/" />);
  expect(screen.getByText('Hello, Alex')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
});

it('signs out and stays on a public page', async () => {
  render(<AccountLinks currentPath="/artworks" />);
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
  expect(replace).not.toHaveBeenCalled();
});

it('leaves a private page after sign-out', async () => {
  render(<AccountLinks currentPath="/dashboard" />);
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
});

it('announces when server sign-out could not be confirmed', async () => {
  signOut.mockResolvedValue(false);
  render(<AccountLinks currentPath="/" />);
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Could not confirm sign-out with the server.');
});
