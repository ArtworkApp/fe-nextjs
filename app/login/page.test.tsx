import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LoginPage from './page';

vi.mock('../../components/auth/AuthForm', () => ({
  AuthForm: ({ isPasswordResetComplete }: { isPasswordResetComplete?: boolean }) => (
    <div>{isPasswordResetComplete ? 'Reset completed' : 'Normal login'}</div>
  ),
}));

describe('LoginPage', () => {
  it('passes the reset confirmation state to the form', async () => {
    render(await LoginPage({ searchParams: Promise.resolve({ reset: 'success' }) }));
    expect(screen.getByText('Reset completed')).toBeInTheDocument();
  });
});
