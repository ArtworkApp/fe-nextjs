'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { requestPasswordReset, ResetRequestResult } from '../../lib/auth/passwordRecovery';

const schema = z.object({ email: z.email('Enter a valid email address.') });
type FormValues = z.infer<typeof schema>;

function requestErrorMessage(result: ResetRequestResult): string {
  switch (result) {
    case 'rate_limited': return 'Too many attempts. Please try again later.';
    case 'network_error': return 'Unable to connect. Please try again.';
    case 'failed': return 'Unable to send the request right now. Please try again.';
    default: return '';
  }
}

export function ForgotPasswordForm() {
  const pending = useRef(false);
  const [result, setResult] = useState<ResetRequestResult | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  async function submit(values: FormValues): Promise<void> {
    if (pending.current) return;
    pending.current = true;
    setResult(null);
    try {
      setResult(await requestPasswordReset(values.email));
    } finally {
      pending.current = false;
    }
  }

  const errorMessage = result ? requestErrorMessage(result) : '';
  return (
    <main className="min-h-screen bg-stone-50 px-5 py-10 text-stone-900 sm:px-6">
      <div className="mx-auto max-w-md">
        <Link className="text-lg font-semibold" href="/">ArtworkApp</Link>
        <section className="mt-12 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-3xl font-semibold">Forgot password?</h1>
          <p className="mt-2 text-stone-600">Enter your email and we’ll send you a reset link.</p>
          <form className="mt-8 space-y-5" onSubmit={handleSubmit(submit)} noValidate>
            <div>
              <label className="block font-medium" htmlFor="recovery-email">Email</label>
              <input id="recovery-email" type="email" autoComplete="email" inputMode="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-2" {...register('email')} />
              {errors.email && <p id="email-error" className="mt-1 text-sm text-red-700">{errors.email.message}</p>}
            </div>
            {result === 'accepted' && <p role="status" className="text-sm text-stone-700">If an account exists for this email address, a password reset link will be sent.</p>}
            {errorMessage && <p role="alert" className="text-sm text-red-700">{errorMessage}</p>}
            <button type="submit" disabled={isSubmitting} className="w-full rounded-full bg-stone-900 px-6 py-3 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-60">{isSubmitting ? 'Sending…' : 'Send reset link'}</button>
          </form>
          <p className="mt-6 text-center text-sm"><Link className="font-semibold underline" href="/login">Back to sign in</Link></p>
        </section>
      </div>
    </main>
  );
}
