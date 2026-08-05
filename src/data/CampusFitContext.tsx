import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { DemoState, TenantSlug, UserProfile } from '../domain/types';
import { createDemoState, demoAccounts } from './seed';

interface ToastMessage { id: number; message: string; tone: 'success' | 'info' | 'warning' }

interface CampusFitContextValue {
  states: Record<TenantSlug, DemoState>;
  sessions: Record<TenantSlug, UserProfile | undefined>;
  accounts: typeof demoAccounts;
  updateTenant: (tenant: TenantSlug, updater: (state: DemoState) => DemoState, message?: string) => void;
  resetTenant: (tenant: TenantSlug) => void;
  signInAs: (tenant: TenantSlug, user: UserProfile) => void;
  signOut: (tenant: TenantSlug) => void;
  toast?: ToastMessage;
  dismissToast: () => void;
  notify: (message: string, tone?: ToastMessage['tone']) => void;
}

const CampusFitContext = createContext<CampusFitContextValue | null>(null);

const sessionKey = (tenant: TenantSlug): string => `campusfit.demo.session.${tenant}`;

const readStoredSession = (tenant: TenantSlug): UserProfile | undefined => {
  if (typeof window === 'undefined') return undefined;
  try {
    const userId = window.sessionStorage.getItem(sessionKey(tenant));
    return demoAccounts[tenant].find((account) => account.id === userId);
  } catch {
    return undefined;
  }
};

const createInitialStates = (): Record<TenantSlug, DemoState> => {
  const nyu = createDemoState('nyu');
  const nyuSession = readStoredSession('nyu');
  return {
    nyu: nyuSession ? { ...nyu, currentUser: nyuSession } : nyu
  };
};

export function CampusFitProvider({ children }: { children: ReactNode }) {
  const [states, setStates] = useState<Record<TenantSlug, DemoState>>(createInitialStates);
  const [sessions, setSessions] = useState<Record<TenantSlug, UserProfile | undefined>>(() => ({ nyu: readStoredSession('nyu') }));
  const [toast, setToast] = useState<ToastMessage>();

  const notify = useCallback((message: string, tone: ToastMessage['tone'] = 'success') => {
    setToast({ id: Date.now(), message, tone });
  }, []);

  const updateTenant = useCallback((tenant: TenantSlug, updater: (state: DemoState) => DemoState, message?: string) => {
    setStates((current) => ({ ...current, [tenant]: updater(current[tenant]) }));
    if (message) notify(message);
  }, [notify]);

  const resetTenant = useCallback((tenant: TenantSlug) => {
    setStates((current) => {
      const reset = createDemoState(tenant);
      const session = sessions[tenant];
      return { ...current, [tenant]: session ? { ...reset, currentUser: session } : reset };
    });
    notify(`${tenant.toUpperCase()} demo data reset`);
  }, [notify, sessions]);

  const signInAs = useCallback((tenant: TenantSlug, user: UserProfile) => {
    if (user.universityId !== states[tenant].university.id) throw new Error('Cross-tenant sign-in denied');
    setStates((current) => ({ ...current, [tenant]: { ...current[tenant], currentUser: user } }));
    setSessions((current) => ({ ...current, [tenant]: user }));
    try { window.sessionStorage.setItem(sessionKey(tenant), user.id); } catch { /* Session still works in memory. */ }
  }, [states]);

  const signOut = useCallback((tenant: TenantSlug) => {
    setSessions((current) => ({ ...current, [tenant]: undefined }));
    try { window.sessionStorage.removeItem(sessionKey(tenant)); } catch { /* Memory session is still cleared. */ }
    setToast(undefined);
  }, []);

  const value = useMemo(() => ({
    states, sessions, accounts: demoAccounts, updateTenant, resetTenant, signInAs, signOut, toast,
    dismissToast: () => setToast(undefined), notify
  }), [states, sessions, updateTenant, resetTenant, signInAs, signOut, toast, notify]);

  return <CampusFitContext.Provider value={value}>{children}</CampusFitContext.Provider>;
}

export const useCampusFit = (): CampusFitContextValue => {
  const context = useContext(CampusFitContext);
  if (!context) throw new Error('useCampusFit must be used inside CampusFitProvider');
  return context;
};
