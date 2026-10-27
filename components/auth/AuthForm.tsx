'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { authUrl, readApiError } from '../../lib/auth/api';
import { safeNextPath } from '../../lib/auth/nextPath';
import { useSession } from './SessionProvider';

const formSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(12, 'Password must be at least 12 characters.'),
  confirmPassword: z.string(),
});
type FormValues = z.infer<typeof formSchema>;

export function AuthForm({ mode, next }: { mode: 'login' | 'register'; next?: string | string[] | null }) {
  const router = useRouter();
  const { refresh } = useSession();
  const destination = safeNextPath(next);
  const [requestError, setRequestError] = useState('');
  const [alreadyExists, setAlreadyExists] = useState(false);
  const pending = useRef(false);
  const { register, handleSubmit, setValue, setError, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema.refine(
      (value) => mode === 'login' || value.password === value.confirmPassword,
      { path: ['confirmPassword'], message: 'Passwords do not match.' },
    )),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  async function submit(values: FormValues) {
    if (pending.current) return;
    pending.current = true;
    setRequestError('');
    setAlreadyExists(false);
    try {
      const response = await fetch(authUrl(mode), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email.trim().toLowerCase(), password: values.password, client: 'web' }),
      });
      if (response.ok) {
        if (await refresh()) {
          router.push(destination);
        } else {
          setRequestError('Sign-in succeeded, but your session could not be confirmed. Please try again.');
        }
        return;
      }
      const { error } = await readApiError(response);
      if (error?.code === 'VALIDATION_ERROR') {
        for (const field of ['email', 'password'] as const) {
          const message = error.fields?.[field]?.[0];
          if (message) setError(field, { type: 'server', message });
        }
        setRequestError('Please check the highlighted fields.');
      } else if (error?.code === 'EMAIL_ALREADY_EXISTS' && mode === 'register') {
        setAlreadyExists(true);
        setRequestError('This email is already registered.');
      } else if (error?.code === 'INVALID_CREDENTIALS') {
        setRequestError('Email or password is incorrect.');
      } else if (error?.code === 'RATE_LIMITED' || response.status === 429) {
        setRequestError('Too many attempts. Please try again later.');
      } else {
        setRequestError('Unable to sign in right now. Please try again.');
      }
    } catch {
      setRequestError('Unable to connect. Please try again.');
    } finally {
      setValue('password', '');
      setValue('confirmPassword', '');
      pending.current = false;
    }
  }

  const switchPath = mode === 'login' ? '/register' : '/login';
  const switchHref = typeof next === 'string' && (destination !== '/dashboard' || next === '/dashboard')
    ? `${switchPath}?next=${encodeURIComponent(destination)}` : switchPath;

  return (
    <main className="min-h-screen bg-stone-50 px-5 py-10 text-stone-900 sm:px-6">
      <div className="mx-auto max-w-md">
        <Link className="text-lg font-semibold" href="/">ArtworkApp</Link>
        <section className="mt-12 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-3xl font-semibold">{mode === 'login' ? 'Sign in' : 'Create your account'}</h1>
          <p className="mt-2 text-stone-600">{mode === 'login' ? 'Welcome back.' : 'Join to discover original art.'}</p>
          <form className="mt-8 space-y-5" onSubmit={handleSubmit(submit)} noValidate>
            <div>
              <label className="block font-medium" htmlFor="email">Email</label>
              <input id="email" type="email" autoComplete="email" inputMode="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-2" {...register('email')} />
              {errors.email && <p id="email-error" className="mt-1 text-sm text-red-700">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block font-medium" htmlFor="password">Password</label>
              <input id="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} aria-invalid={!!errors.password} aria-describedby={errors.password ? 'password-error' : undefined} className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-2" {...register('password')} />
              {errors.password && <p id="password-error" className="mt-1 text-sm text-red-700">{errors.password.message}</p>}
            </div>
            {mode === 'register' && <div>
              <label className="block font-medium" htmlFor="confirmPassword">Confirm password</label>
              <input id="confirmPassword" type="password" autoComplete="new-password" aria-invalid={!!errors.confirmPassword} aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined} className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-2" {...register('confirmPassword')} />
              {errors.confirmPassword && <p id="confirmPassword-error" className="mt-1 text-sm text-red-700">{errors.confirmPassword.message}</p>}
            </div>}
            {requestError && <p role="status" aria-live="polite" className="text-sm text-red-700">{requestError} {alreadyExists && <Link className="font-semibold underline" href={switchHref}>Sign in instead</Link>}</p>}
            <button type="submit" disabled={isSubmitting} className="w-full rounded-full bg-stone-900 px-6 py-3 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-60">{isSubmitting ? (mode === 'login' ? 'Signing in…' : 'Creating account…') : (mode === 'login' ? 'Sign in' : 'Create account')}</button>
          </form>
          <p className="mt-6 text-center text-sm text-stone-600">{mode === 'login' ? 'New here?' : 'Already have an account?'}{' '}<Link className="font-semibold text-stone-900 underline" href={switchHref}>{mode === 'login' ? 'Create an account' : 'Sign in'}</Link></p>
        </section>
      </div>
    </main>
  );
}
