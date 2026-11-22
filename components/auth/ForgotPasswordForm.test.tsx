import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestPasswordReset } from '../../lib/auth/passwordRecovery';
import { ForgotPasswordForm } from './ForgotPasswordForm';

vi.mock('../../lib/auth/passwordRecovery', () => ({ requestPasswordReset: vi.fn() }));

describe('ForgotPasswordForm', () => {
  beforeEach(() => vi.mocked(requestPasswordReset).mockReset());

  it('validates the email before submitting', async () => {
    render(<ForgotPasswordForm />);
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-describedby', 'email-error');
    expect(requestPasswordReset).not.toHaveBeenCalled();
  });

  it('shows a neutral confirmation and prevents duplicate submissions', async () => {
    let finish!: (result: 'accepted') => void;
    vi.mocked(requestPasswordReset).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'person@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
    await waitFor(() => expect(requestPasswordReset).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled();
    finish('accepted');
    expect(await screen.findByRole('status')).toHaveTextContent('If an account exists for this email address, a password reset link will be sent.');
  });

  it.each([
    ['rate_limited', 'Too many attempts. Please try again later.'],
    ['network_error', 'Unable to connect. Please try again.'],
    ['failed', 'Unable to send the request right now. Please try again.'],
  ] as const)('shows safe feedback for %s and permits retry', async (result, message) => {
    vi.mocked(requestPasswordReset).mockResolvedValue(result);
    render(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'person@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('button', { name: 'Send reset link' })).toBeEnabled();
  });
});
