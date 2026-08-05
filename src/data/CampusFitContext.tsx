import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { DemoState, TenantSlug, UserProfile } from '../domain/types';
import { createDemoState, demoAccounts } from './seed';
import { autoCloseStaleVisits } from '../services/visitLifecycle';
import { getActiveVisitTiming } from '../services/visitReminders';

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
  const remindedVisits = useRef(new Set<string>());

  const notify = useCallback((message: string, tone: ToastMessage['tone'] = 'success') => {
    setToast({ id: Date.now(), message, tone });
  }, []);

  useEffect(() => {
    const syncToLaptopClock = () => {
      const now = new Date().toISOString();
      let reminder: string | undefined;
      let autoClosed = false;
      setStates((current) => Object.fromEntries(Object.entries(current).map(([tenant, state]) => {
        const clockSynced = { ...state, now };
        const active = clockSynced.visits.find((visit) => visit.userId === clockSynced.currentUser.id && visit.status === 'checked_in');
        const reminderKey = active ? `${active.id}:${active.expectedEndAt}` : '';
        if (active && getActiveVisitTiming(active, now) === 'grace_period' && !remindedVisits.current.has(reminderKey)) {
          remindedVisits.current.add(reminderKey);
          reminder = 'Are you done with your workout? Check out now or extend your finish time. CampusFit will auto-check you out in 30 minutes.';
        }
        const next = autoCloseStaleVisits(clockSynced, now);
        if (active && next.visits.find((visit) => visit.id === active.id)?.status === 'auto_closed') autoClosed = true;
        return [tenant, next];
      })) as Record<TenantSlug, DemoState>);
      if (reminder) {
        notify(reminder, 'warning');
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') new Notification('CampusFit visit', { body: reminder });
      } else if (autoClosed) notify('CampusFit automatically checked you out after the 30-minute grace period.', 'info');
    };
    syncToLaptopClock();
    const interval = window.setInterval(syncToLaptopClock, 15_000);
    return () => window.clearInterval(interval);
  }, [notify]);

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
