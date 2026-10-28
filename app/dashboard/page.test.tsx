import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from './page';

const replace = vi.fn();
const refresh = vi.fn();
const mockUseSession = vi.fn();

vi.mock('../../components/auth/SessionProvider', () => ({
  useSession: (...args: unknown[]) => mockUseSession(...args),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ replace }),
}));

describe('dashboard route', () => {
  beforeEach(() => {
    replace.mockReset();
    refresh.mockReset();
    mockUseSession.mockReset();
  });

  it('redirects anonymous users who are not signed out', async () => {
    mockUseSession.mockReturnValue({
      state: 'anonymous',
      user: null,
      refresh,
      signedOut: false,
    });

    render(<DashboardPage />);

    expect(screen.getByRole('status')).toHaveTextContent('Redirecting to sign in…');
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login?next=%2Fdashboard'));
  });

  it('shows a loading state while the session is being checked', () => {
    mockUseSession.mockReturnValue({
      state: 'loading',
      user: null,
      refresh,
      signedOut: false,
    });

    render(<DashboardPage />);

    expect(screen.getByRole('status')).toHaveTextContent('Checking your session…');
    expect(replace).not.toHaveBeenCalled();
  });

  it('shows an error state with a retry action', async () => {
    mockUseSession.mockReturnValue({
      state: 'error',
      user: null,
      refresh,
      signedOut: false,
    });

    render(<DashboardPage />);

    expect(screen.getByRole('status')).toHaveTextContent('Unable to check your session.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });
});
