import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { confirmPasswordReset } from '../../lib/auth/passwordRecovery';
import { ResetPasswordForm } from './ResetPasswordForm';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('../../lib/auth/passwordRecovery', () => ({ confirmPasswordReset: vi.fn() }));
const token = 'a'.repeat(43);

describe('ResetPasswordForm', () => {
  beforeEach(() => {
    push.mockReset();
    vi.mocked(confirmPasswordReset).mockReset();
    window.history.replaceState(null, '', `/reset-password#token=${token}`);
  });

  it('removes the fragment without submitting the token', async () => {
    render(<ResetPasswordForm />);
    expect(await screen.findByLabelText('New password')).toBeInTheDocument();
    expect(window.location.hash).toBe('');
    expect(confirmPasswordReset).not.toHaveBeenCalled();
  });

  it.each(['', '#token=bad', `#token=${token}&token=${token}`])('shows a safe recovery link for a missing or malformed token', async (fragment) => {
    window.history.replaceState(null, '', `/reset-password${fragment}`);
    render(<ResetPasswordForm />);
    expect(await screen.findByText('This reset link is invalid or has expired.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Request another link' })).toHaveAttribute('href', '/forgot-password');
    expect(window.location.hash).toBe('');
  });

  it('checks the password and confirmation before making a request', async () => {
    render(<ResetPasswordForm />);
    fireEvent.change(await screen.findByLabelText('New password'), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'different' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));
    expect(await screen.findByText('Password must be at least 12 characters.')).toBeInTheDocument();
    expect(confirmPasswordReset).not.toHaveBeenCalled();
  });

  it('rejects mismatched confirmation and supports independent password visibility', async () => {
    render(<ResetPasswordForm />);
    const password = await screen.findByLabelText('New password');
    const confirmation = screen.getByLabelText('Confirm password');
    fireEvent.change(password, { target: { value: 'new-password-123' } });
    fireEvent.change(confirmation, { target: { value: 'different-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Show confirmation password' }));
    expect(confirmation).toHaveAttribute('type', 'text');
    expect(password).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));
    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
    expect(confirmPasswordReset).not.toHaveBeenCalled();
  });

  it('reports a network error and allows a retry', async () => {
    vi.mocked(confirmPasswordReset).mockResolvedValue('network_error');
    render(<ResetPasswordForm />);
    fireEvent.change(await screen.findByLabelText('New password'), { target: { value: 'new-password-123' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'new-password-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to connect. Please try again.');
    expect(screen.getByRole('button', { name: 'Reset password' })).toBeEnabled();
    expect(screen.getByLabelText('New password')).toHaveValue('');
  });

  it('submits once and directs the user to sign in after success', async () => {
    let finish!: (result: 'confirmed') => void;
    vi.mocked(confirmPasswordReset).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(<ResetPasswordForm />);
    fireEvent.change(await screen.findByLabelText('New password'), { target: { value: 'new-password-123' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'new-password-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));
    await waitFor(() => expect(confirmPasswordReset).toHaveBeenCalledWith({ token, password: 'new-password-123' }));
    expect(screen.getByRole('button', { name: 'Resetting…' })).toBeDisabled();
    finish('confirmed');
    await waitFor(() => expect(push).toHaveBeenCalledWith('/login?reset=success'));
  });

  it('shows the recovery link when the backend rejects a token', async () => {
    vi.mocked(confirmPasswordReset).mockResolvedValue('invalid_token');
    render(<ResetPasswordForm />);
    fireEvent.change(await screen.findByLabelText('New password'), { target: { value: 'new-password-123' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'new-password-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));
    expect(await screen.findByRole('link', { name: 'Request another link' })).toHaveAttribute('href', '/forgot-password');
  });
});
