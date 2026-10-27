'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { authUrl, UserProfile } from '../../lib/auth/api';

type SessionState = 'loading' | 'authenticated' | 'anonymous' | 'error';
interface SessionContextValue {
  state: SessionState;
  user: UserProfile | null;
  refresh: () => Promise<boolean>;
  signOut: () => Promise<boolean>;
  signedOut: boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>('loading');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const requestId = useRef(0);

  const refresh = useCallback(async (): Promise<boolean> => {
    const currentRequest = ++requestId.current;
    try {
      let response = await fetch(authUrl('me'), { credentials: 'include', cache: 'no-store' });
      if (response.status === 401) {
        const renewal = await fetch(authUrl('refresh'), {
          method: 'POST', credentials: 'include', cache: 'no-store',
          headers: { 'Content-Type': 'application/json' }, body: '{}',
        });
        if (renewal.ok) {
          response = await fetch(authUrl('me'), { credentials: 'include', cache: 'no-store' });
        } else {
          response = renewal;
        }
      }
      if (currentRequest !== requestId.current) return false;
      if (!response.ok) {
        setUser(null);
        setState(response.status === 401 ? 'anonymous' : 'error');
        return false;
      }
      const body = await response.json() as { user?: UserProfile };
      if (!body.user?.id) throw new Error('Invalid session response');
      if (currentRequest !== requestId.current) return false;
      setUser(body.user);
      setState('authenticated');
      setSignedOut(false);
      return true;
    } catch {
      if (currentRequest !== requestId.current) return false;
      setUser(null);
      setState('error');
      return false;
    }
  }, []);

  const signOut = useCallback(async (): Promise<boolean> => {
    requestId.current++;
    setUser(null);
    setState('anonymous');
    setSignedOut(true);
    try {
      const response = await fetch(authUrl('logout'), {
        method: 'POST', credentials: 'include', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      return response.ok || response.status === 401;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  return <SessionContext.Provider value={{ state, user, refresh, signOut, signedOut }}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const session = useContext(SessionContext);
  if (!session) throw new Error('SessionProvider is required');
  return session;
}
