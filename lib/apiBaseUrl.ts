export function apiBaseUrl(): string | undefined {
  const configured = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '');
  if (!configured) return undefined;
  return configured.endsWith('/api/v1') ? configured : `${configured}/api/v1`;
}
