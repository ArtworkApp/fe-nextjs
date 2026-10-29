import { NextRequest, NextResponse } from 'next/server';
import { authCookies, authEndpoint, cookieHeader, hasMalformedAuthCookie, rotatedAuthCookies, verifyAccess } from './lib/auth/serverSession';

export const config = { matcher: ['/dashboard/:path*'] };

function clearAuthCookies(response: NextResponse): void {
  for (const name of ['artwork_access', 'artwork_refresh']) {
    response.cookies.set({
      name,
      value: '',
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(0),
      ...(process.env.AUTH_COOKIE_DOMAIN ? { domain: process.env.AUTH_COOKIE_DOMAIN } : {}),
    });
  }
}

function loginRedirect(request: NextRequest): NextResponse {
  const destination = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const url = new URL('/login', request.url);
  url.searchParams.set('next', destination);
  const response = NextResponse.redirect(url);
  clearAuthCookies(response);
  return response;
}

function unavailable(request: NextRequest): NextResponse {
  const url = new URL('/session-unavailable', request.url);
  url.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.rewrite(url);
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const rawCookie = request.headers.get('cookie') ?? '';
  if (hasMalformedAuthCookie(rawCookie)) return loginRedirect(request);
  const incoming = authCookies(rawCookie);
  const access = await verifyAccess(incoming);
  if (access.state === 'authenticated') return NextResponse.next();
  if (access.state === 'error') return unavailable(request);
  if (!incoming.has('artwork_refresh')) return loginRedirect(request);

  let refresh: Response;
  try {
    refresh = await fetch(authEndpoint('refresh'), {
      method: 'POST',
      headers: {
        Cookie: cookieHeader(new Map([['artwork_refresh', incoming.get('artwork_refresh')!]])),
        Origin: request.nextUrl.origin,
        'Content-Type': 'application/json',
      },
      body: '{}',
      cache: 'no-store',
    });
  } catch {
    return unavailable(request);
  }
  if (refresh.status === 401 || refresh.status === 400) return loginRedirect(request);
  if (!refresh.ok) return unavailable(request);

  const rotated = rotatedAuthCookies(refresh.headers);
  if (!rotated.cookies.has('artwork_access') || !rotated.cookies.has('artwork_refresh')) {
    return loginRedirect(request);
  }
  const verified = await verifyAccess(rotated.cookies);
  if (verified.state === 'anonymous') return loginRedirect(request);
  if (verified.state === 'error') return unavailable(request);

  const headers = new Headers(request.headers);
  headers.set('cookie', cookieHeader(rotated.cookies));
  const response = NextResponse.next({ request: { headers } });
  for (const setCookie of rotated.headers) response.headers.append('Set-Cookie', setCookie);
  return response;
}
