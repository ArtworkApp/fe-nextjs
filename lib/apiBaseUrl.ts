export function apiBaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
}
