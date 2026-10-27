'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { safeNextPath } from '../../lib/auth/nextPath';
import { useSession } from './SessionProvider';

export function AccountLinks({ currentPath }: { currentPath: string }) {
  const { state, user, refresh, signOut } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [isSigningOut, setIsSigningOut] = useState(false);
  const pending = useRef(false);
  const search = searchParams.toString();
  const next = safeNextPath(`${currentPath}${search ? `?${search}` : ''}`);

  async function handleSignOut() {
    if (pending.current) return;
    pending.current = true;
    setIsSigningOut(true);
    setError('');
    const confirmed = await signOut();
    if (!confirmed) setError('Could not confirm sign-out with the server.');
    if (currentPath.startsWith('/dashboard')) router.replace('/');
    pending.current = false;
    setIsSigningOut(false);
  }

  return (
    <nav aria-label="Account" className="flex flex-wrap items-center gap-2 text-sm">
      {state === 'authenticated' && user ? <>
        <span className="px-2 text-stone-700">Hello, {user.displayName || user.email}</span>
        <button type="button" onClick={() => void handleSignOut()} disabled={isSigningOut} className="rounded-full border border-stone-300 px-4 py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60">{isSigningOut ? 'Signing out…' : 'Sign out'}</button>
      </> : state === 'loading' ? (
        <span role="status" className="text-stone-500">Checking account…</span>
      ) : <>
        <Link className="rounded-full px-4 py-2 font-medium text-stone-900 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2" href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link>
        <Link className="rounded-full bg-stone-900 px-4 py-2 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2" href={`/register?next=${encodeURIComponent(next)}`}>Create account</Link>
        {state === 'error' && <button type="button" onClick={() => void refresh()} className="underline">Retry account check</button>}
      </>}
      {error && <span role="status" aria-live="polite" className="w-full text-red-700">{error}</span>}
    </nav>
  );
}
