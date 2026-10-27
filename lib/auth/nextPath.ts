export function safeNextPath(next: unknown): string {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//')) return '/dashboard';
  if (/[\\%\x00-\x1f\x7f]/.test(next)) return '/dashboard';
  try {
    const url = new URL(next, 'http://internal.invalid');
    if (url.origin !== 'http://internal.invalid') return '/dashboard';
    if (url.pathname.split('/').some((part) => part === '.' || part === '..')) return '/dashboard';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/dashboard';
  }
}
