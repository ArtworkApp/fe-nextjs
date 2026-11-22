import { z } from 'zod';

export const resetPasswordSchema = z.object({
  password: z.string().min(12, 'Password must be at least 12 characters.'),
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, {
  path: ['confirmPassword'], message: 'Passwords do not match.',
});

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

function removeUrlFragment(): void {
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);
}

function parseResetToken(fragment: string): string | null {
  const tokens = new URLSearchParams(fragment).getAll('token');
  return tokens.length === 1 && /^[A-Za-z0-9_-]{43}$/.test(tokens[0]) ? tokens[0] : null;
}

export function takeResetToken(): string | null {
  const fragment = window.location.hash.slice(1);
  removeUrlFragment();
  return parseResetToken(fragment);
}
