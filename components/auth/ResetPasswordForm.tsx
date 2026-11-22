'use client';

import Link from 'next/link';
import { ResetConfirmationResult } from '../../lib/auth/passwordRecovery';
import { useResetPasswordForm } from '../../hooks/useResetPasswordForm';

function resetErrorMessage(result: ResetConfirmationResult): string {
  switch (result) {
    case 'rate_limited': return 'Too many attempts. Please try again later.';
    case 'network_error': return 'Unable to connect. Please try again.';
    case 'failed': return 'Unable to reset your password right now. Please try again.';
    default: return '';
  }
}

export function ResetPasswordForm() {
  const { token, result, showPassword, setShowPassword, showConfirmation, setShowConfirmation, form, submit } = useResetPasswordForm();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = form;

  const error = result ? resetErrorMessage(result) : '';
  return (
    <main className="min-h-screen bg-stone-50 px-5 py-10 text-stone-900 sm:px-6">
      <div className="mx-auto max-w-md">
        <Link className="text-lg font-semibold" href="/">ArtworkApp</Link>
        <section className="mt-12 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-3xl font-semibold">Reset password</h1>
          {token === undefined && <p className="mt-2 text-stone-600">Checking your link…</p>}
          {token === null && result !== 'confirmed' && <div className="mt-6" role="alert"><p>This reset link is invalid or has expired.</p><Link className="mt-3 inline-block font-semibold underline" href="/forgot-password">Request another link</Link></div>}
          {token && <form className="mt-8 space-y-5" onSubmit={handleSubmit(submit)} noValidate>
            <div>
              <label className="block font-medium" htmlFor="new-password">New password</label>
              <div className="mt-2 flex items-center gap-2">
                <input id="new-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" aria-invalid={!!errors.password} aria-describedby={errors.password ? 'password-hint password-error' : 'password-hint'} className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-2" {...register('password')} />
                <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-controls="new-password" aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)} className="rounded-lg border border-stone-300 px-3 py-3 text-sm font-medium">{showPassword ? 'Hide' : 'Show'}</button>
              </div>
              <p id="password-hint" className="mt-1 text-sm text-stone-600">Use at least 12 characters.</p>
              {errors.password && <p id="password-error" className="mt-1 text-sm text-red-700">{errors.password.message}</p>}
            </div>
            <div>
              <label className="block font-medium" htmlFor="confirm-password">Confirm password</label>
              <div className="mt-2 flex items-center gap-2">
                <input id="confirm-password" type={showConfirmation ? 'text' : 'password'} autoComplete="new-password" aria-invalid={!!errors.confirmPassword} aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined} className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-2" {...register('confirmPassword')} />
                <button type="button" aria-label={showConfirmation ? 'Hide confirmation password' : 'Show confirmation password'} aria-controls="confirm-password" aria-pressed={showConfirmation} onClick={() => setShowConfirmation((visible) => !visible)} className="rounded-lg border border-stone-300 px-3 py-3 text-sm font-medium">{showConfirmation ? 'Hide' : 'Show'}</button>
              </div>
              {errors.confirmPassword && <p id="confirm-password-error" className="mt-1 text-sm text-red-700">{errors.confirmPassword.message}</p>}
            </div>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={isSubmitting} className="w-full rounded-full bg-stone-900 px-6 py-3 font-medium text-white disabled:cursor-wait disabled:opacity-60">{isSubmitting ? 'Resetting…' : 'Reset password'}</button>
          </form>}
        </section>
      </div>
    </main>
  );
}
