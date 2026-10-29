import Link from 'next/link';
import { safeNextPath } from '../../lib/auth/nextPath';

export default async function SessionUnavailablePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="min-h-screen bg-stone-50 p-8 text-stone-900" role="status">
      <h1 className="text-2xl font-semibold">Unable to check your session.</h1>
      <p className="mt-3">Please try again.</p>
      <Link className="mt-4 inline-block underline" href={safeNextPath(next)}>Retry</Link>
    </main>
  );
}
