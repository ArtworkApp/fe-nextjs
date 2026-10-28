'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from '../../components/auth/SessionProvider';
import { SiteHeader } from '../../components/SiteHeader';

export default function DashboardPage() {
  const { state, user, refresh, signedOut } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (state === 'anonymous' && !signedOut) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [pathname, router, signedOut, state]);

  if (state === 'loading') return <main className="p-8" role="status">Checking your session…</main>;
  if (state === 'error') return <main className="p-8" role="status">Unable to check your session. <button className="underline" onClick={() => void refresh()}>Retry</button></main>;
  if (state !== 'authenticated' || !user) return <main className="p-8" role="status">Redirecting to sign in…</main>;

  return <main className="min-h-screen bg-stone-50 px-6 py-10 text-stone-900"><div className="mx-auto max-w-5xl"><SiteHeader currentPath={pathname} /><h1 className="mt-16 text-4xl font-semibold">Dashboard</h1><p className="mt-4">Signed in as {user.email}</p></div></main>;
}
