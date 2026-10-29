import { apiBaseUrl } from '../apiBaseUrl';
import type { UserProfile } from './api';

export type AccessResult =
  | { state: 'authenticated'; user: UserProfile }
  | { state: 'anonymous' }
  | { state: 'error' };

const AUTH_COOKIE_NAMES = ['artwork_access', 'artwork_refresh'] as const;

export function hasMalformedAuthCookie(header: string): boolean {
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    if (!AUTH_COOKIE_NAMES.some((allowed) => allowed === name)) continue;
    if (!/^[A-Za-z0-9._-]+$/.test(part.slice(separator + 1).trim())) return true;
  }
  return false;
}

export function authCookies(header: string): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (AUTH_COOKIE_NAMES.some((allowed) => allowed === name) && /^[A-Za-z0-9._-]+$/.test(value)) {
      cookies.set(name, value);
    }
  }
  return cookies;
}

export function cookieHeader(cookies: Map<string, string>): string {
  return AUTH_COOKIE_NAMES.flatMap((name) => {
    const value = cookies.get(name);
    return value ? [`${name}=${value}`] : [];
  }).join('; ');
}

export function authEndpoint(path: 'me' | 'refresh'): string {
  const base = apiBaseUrl();
  if (!base) throw new Error('NEXT_PUBLIC_API_URL is required for server authentication.');
  return `${base}/auth/${path}`;
}

function isUserProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== 'object') return false;
  const user = value as Record<string, unknown>;
  return typeof user.id === 'string' && typeof user.email === 'string' &&
    (typeof user.displayName === 'string' || user.displayName === null) &&
    (typeof user.avatarUrl === 'string' || user.avatarUrl === null);
}

export async function verifyAccess(cookies: Map<string, string>): Promise<AccessResult> {
  if (!cookies.has('artwork_access')) return { state: 'anonymous' };
  try {
    const response = await fetch(authEndpoint('me'), {
      method: 'GET',
      headers: { Cookie: cookieHeader(cookies) },
      cache: 'no-store',
    });
    if (response.status === 401) return { state: 'anonymous' };
    if (!response.ok) return { state: 'error' };
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object' || !('user' in body) || !isUserProfile(body.user)) {
      return { state: 'error' };
    }
    return { state: 'authenticated', user: body.user };
  } catch {
    return { state: 'error' };
  }
}

export function rotatedAuthCookies(headers: Headers): { cookies: Map<string, string>; headers: string[] } {
  const rotated = new Map<string, string>();
  const setCookieHeaders: string[] = [];
  for (const header of headers.getSetCookie()) {
    const firstPart = header.split(';', 1)[0];
    const separator = firstPart.indexOf('=');
    if (separator < 0) continue;
    const name = firstPart.slice(0, separator).trim();
    const value = firstPart.slice(separator + 1).trim();
    if (AUTH_COOKIE_NAMES.some((allowed) => allowed === name) && /^[A-Za-z0-9._-]+$/.test(value)) {
      rotated.set(name, value);
      setCookieHeaders.push(header);
    }
  }
  return { cookies: rotated, headers: setCookieHeaders };
}
