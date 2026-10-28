import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Home from './page';

vi.mock('../components/auth/SessionProvider', () => ({
  useSession: () => ({ state: 'anonymous', user: null, signOut: async () => true }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }), useSearchParams: () => new URLSearchParams() }));

describe('home route', () => {
  it('provides a main page entry with a link to artwork listings', () => {
    render(<Home />);
    expect(screen.getByRole('link', { name: 'ArtworkApp' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Account' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login?next=%2F');
    expect(screen.getByRole('link', { name: 'Create account' })).toHaveAttribute('href', '/register?next=%2F');
    expect(screen.getByRole('link', { name: 'Browse artworks' })).toHaveAttribute('href', '/artworks');
    expect(screen.queryByLabelText('Sort artworks')).not.toBeInTheDocument();
  });
});
