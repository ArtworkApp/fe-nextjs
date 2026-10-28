import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthForm } from './AuthForm';

const push = vi.fn();
const refresh = vi.fn(async () => true);
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('./SessionProvider', () => ({ useSession: () => ({ refresh }) }));

const password = 'long-password-123';
function fill(mode: 'login' | 'register', confirmation = password) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'person@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  if (mode === 'register') fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: confirmation } });
}

beforeEach(() => {
  push.mockReset();
  refresh.mockReset().mockResolvedValue(true);
  vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:3001/api/v1');
  vi.stubGlobal('fetch', vi.fn());
});

describe('email authentication', () => {
  it.each(['login', 'register'] as const)('explains the password rule and lets users reveal it on %s', (mode) => {
    render(<AuthForm mode={mode} />);
    const input = screen.getByLabelText('Password');
    expect(screen.getByText('Use at least 12 characters.')).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-describedby', 'password-hint');
    fireEvent.change(input, { target: { value: password } });
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveValue(password);
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveValue(password);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('reveals confirmation independently of the password on registration', () => {
    render(<AuthForm mode="register" />);
    const passwordInput = screen.getByLabelText('Password');
    const confirmation = screen.getByLabelText('Confirm password');
    fireEvent.click(screen.getByRole('button', { name: 'Show confirmation password' }));
    expect(confirmation).toHaveAttribute('type', 'text');
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('rejects invalid input and confirmation mismatch before a request', async () => {
    render(<AuthForm mode="register" next="/dashboard" />);
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-describedby', 'email-error');
    expect(fetch).not.toHaveBeenCalled();
    fill('register', 'different-password-123');
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('enforces the 12-character password rule before login', async () => {
    render(<AuthForm mode="login" />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'person@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Password must be at least 12 characters.')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('posts only web credentials, prevents duplicate submission, refreshes session, and follows a safe path', async () => {
    let resolveRequest!: (value: Response) => void;
    vi.mocked(fetch).mockReturnValue(new Promise((resolve) => { resolveRequest = resolve; }));
    render(<AuthForm mode="register" next="/dashboard/gallery?sort=new" />);
    fill('register');
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Creating account…' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Creating account…' }));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('http://localhost:3001/api/v1/auth/register', expect.objectContaining({
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'person@example.com', password, client: 'web' }),
    }));
    resolveRequest({ ok: true } as Response);
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(push).toHaveBeenCalledWith('/dashboard/gallery?sort=new');
  });

  it('returns to the original public page with its query after sign-in', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);
    const next = '/artworks?country=South%20Korea&sort=price_asc';
    render(<AuthForm mode="login" next={next} />);
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', `/register?next=${encodeURIComponent(next)}`);
    fill('login');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith(next));
  });

  it.each(['//evil.test', 'https://evil.test', '/%2f%2fevil.test', '/dashboard/%2e%2e/login'])('rejects unsafe next %s in links and navigation', async (next) => {
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);
    render(<AuthForm mode="login" next={next} />);
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/register');
    fill('login');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'));
  });

  it('maps validation fields and clears passwords after failed authentication', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: { code: 'VALIDATION_ERROR', fields: { email: ['Email is invalid.'], password: ['Password is too short.'] } } }) } as Response);
    render(<AuthForm mode="login" next="/dashboard" />);
    fill('login');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Email is invalid.')).toBeInTheDocument();
    expect(screen.getByText('Password is too short.')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveValue('');
    expect(screen.getByLabelText('Email')).toHaveValue('person@example.com');
  });

  it.each([
    ['EMAIL_ALREADY_EXISTS', 'This email is already registered.', true],
    ['INVALID_CREDENTIALS', 'Email or password is incorrect.', false],
    ['RATE_LIMITED', 'Too many attempts. Please try again later.', false],
  ])('handles %s without showing server details', async (code, message, hasLink) => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: { code, message: 'secret server detail' } }) } as Response);
    render(<AuthForm mode={hasLink ? 'register' : 'login'} next="/dashboard" />);
    fill(hasLink ? 'register' : 'login');
    fireEvent.click(screen.getByRole('button', { name: hasLink ? 'Create account' : 'Sign in' }));
    expect(await screen.findByRole('status')).toHaveTextContent(message);
    expect(screen.queryByText('secret server detail')).not.toBeInTheDocument();
    if (hasLink) expect(screen.getByRole('link', { name: 'Sign in instead' })).toHaveAttribute('href', '/login?next=%2Fdashboard');
  });

  it('keeps email and offers retry after a network failure', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('secret network detail')).mockResolvedValueOnce({ ok: true } as Response);
    render(<AuthForm mode="login" next="/dashboard" />);
    fill('login');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Unable to connect. Please try again.');
    expect(screen.getByLabelText('Email')).toHaveValue('person@example.com');
    expect(screen.getByLabelText('Password')).toHaveValue('');
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'));
  });

  it('does not navigate until the cookie session is confirmed', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);
    refresh.mockResolvedValue(false);
    render(<AuthForm mode="login" next="/dashboard" />);
    fill('login');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('status')).toHaveTextContent('your session could not be confirmed');
    expect(push).not.toHaveBeenCalled();
  });
});
