import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SiteHeader } from '../../components/SiteHeader';
import { authCookies, verifyAccess } from '../../lib/auth/serverSession';

export default async function DashboardPage() {
  const session = await verifyAccess(authCookies((await cookies()).toString()));
  if (session.state === 'anonymous') redirect('/login?next=%2Fdashboard');
  if (session.state === 'error') {
    return <main className="p-8" role="status">Unable to check your session. <a className="underline" href="/dashboard">Retry</a></main>;
  }

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10 text-stone-900">
      <div className="mx-auto max-w-5xl">
        <SiteHeader currentPath="/dashboard" />
        <h1 className="mt-16 text-4xl font-semibold">Dashboard</h1>
        <p className="mt-4">Signed in as {session.user.displayName || session.user.email}</p>
      </div>
    </main>
  );
}
