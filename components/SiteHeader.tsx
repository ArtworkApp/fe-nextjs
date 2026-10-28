import Link from 'next/link';
import { Suspense } from 'react';
import { AccountLinks } from './auth/AccountLinks';

export function SiteHeader({ currentPath }: { currentPath: string }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <Link className="text-lg font-semibold" href="/">ArtworkApp</Link>
      <Suspense fallback={<span role="status">Checking account…</span>}>
        <AccountLinks currentPath={currentPath} />
      </Suspense>
    </header>
  );
}
