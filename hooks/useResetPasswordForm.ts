import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { confirmPasswordReset, ResetConfirmationResult } from '../lib/auth/passwordRecovery';
import { resetPasswordSchema, ResetPasswordValues, takeResetToken } from '../lib/auth/resetPasswordForm';

export function useResetPasswordForm() {
  const router = useRouter();
  const tokenRead = useRef(false);
  const pending = useRef(false);
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [result, setResult] = useState<ResetConfirmationResult | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema), defaultValues: { password: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (tokenRead.current) return;
    tokenRead.current = true;
    setToken(takeResetToken());
  }, []);

  function startSubmission(): void {
    pending.current = true;
    setResult(null);
  }

  function canSubmit(resetToken: string | null | undefined): resetToken is string {
    return Boolean(resetToken) && !pending.current;
  }

  function recordOutcome(outcome: ResetConfirmationResult): void {
    setResult(outcome);
  }

  function clearTokenIfFinished(outcome: ResetConfirmationResult): void {
    if (outcome === 'confirmed' || outcome === 'invalid_token') setToken(null);
  }

  function navigateAfterReset(outcome: ResetConfirmationResult): void {
    if (outcome === 'confirmed') router.push('/login?reset=success');
  }

  function handleOutcome(outcome: ResetConfirmationResult): void {
    recordOutcome(outcome);
    clearTokenIfFinished(outcome);
    navigateAfterReset(outcome);
  }

  function resetFormInputs(): void {
    form.reset();
  }

  function resetPasswordVisibility(): void {
    setShowPassword(false);
    setShowConfirmation(false);
  }

  function clearPasswordInputs(): void {
    resetFormInputs();
    resetPasswordVisibility();
  }

  function endSubmission(): void {
    pending.current = false;
  }

  function finishSubmission(): void {
    clearPasswordInputs();
    endSubmission();
  }

  function requestReset(resetToken: string, values: ResetPasswordValues): Promise<ResetConfirmationResult> {
    return confirmPasswordReset({ token: resetToken, password: values.password });
  }

  async function submit(values: ResetPasswordValues): Promise<void> {
    if (!canSubmit(token)) return;
    startSubmission();
    try {
      const outcome = await requestReset(token, values);
      handleOutcome(outcome);
    } finally {
      finishSubmission();
    }
  }

  return { token, result, showPassword, setShowPassword, showConfirmation, setShowConfirmation, form, submit };
}
