import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { DemoState, TenantSlug, UserProfile } from '../domain/types';
import { createDemoState, demoAccounts } from './seed';
import { autoCloseStaleVisits } from '../services/visitLifecycle';
import { getActiveVisitTiming } from '../services/visitReminders';

interface ToastMessage { id: number; message: string; tone: 'success' | 'info' | 'warning' }

type SharedDemoState = Omit<DemoState, 'currentUser'>;

interface SharedStateEnvelope {
  schemaVersion: 1;
  syncScope: string;
  tenant: TenantSlug;
  revision: number;
  state: SharedDemoState;
}

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
const sharedStateKey = (tenant: TenantSlug): string => `campusfit.demo.shared.${tenant}`;
const SYNC_SCOPE_KEY = 'campusfit.demo.sync-scope';

const readSyncScope = (): string => {
  if (typeof window === 'undefined') return 'server';
  try {
    const existing = window.localStorage.getItem(SYNC_SCOPE_KEY);
    if (existing) return existing;
    const created = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    window.localStorage.setItem(SYNC_SCOPE_KEY, created);
    return created;
  } catch {
    return 'storage-unavailable';
  }
};

const withoutCurrentUser = ({ currentUser: _currentUser, ...state }: DemoState): SharedDemoState => state;

const readSharedState = (tenant: TenantSlug, syncScope = readSyncScope()): SharedStateEnvelope | undefined => {
  if (typeof window === 'undefined') return undefined;
  try {
    const value = window.localStorage.getItem(sharedStateKey(tenant));
    if (!value) return undefined;
    const envelope = JSON.parse(value) as Partial<SharedStateEnvelope>;
    if (
      envelope.schemaVersion !== 1 ||
      envelope.syncScope !== syncScope ||
      envelope.tenant !== tenant ||
      !Number.isFinite(envelope.revision) ||
      !envelope.state ||
      envelope.state.university?.slug !== tenant ||
      !Array.isArray(envelope.state.visits) ||
      !Array.isArray(envelope.state.facilities)
    ) return undefined;
    return envelope as SharedStateEnvelope;
  } catch {
    return undefined;
  }
};

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
  const sharedNyu = readSharedState('nyu');
  return {
    nyu: { ...(sharedNyu?.state ?? nyu), currentUser: nyuSession ?? nyu.currentUser }
  };
};

export function CampusFitProvider({ children }: { children: ReactNode }) {
  const [states, setStates] = useState<Record<TenantSlug, DemoState>>(createInitialStates);
  const [sessions, setSessions] = useState<Record<TenantSlug, UserProfile | undefined>>(() => ({ nyu: readStoredSession('nyu') }));
  const [toast, setToast] = useState<ToastMessage>();
  const statesRef = useRef(states);
  const syncScopeRef = useRef(readSyncScope());
  const channelRef = useRef<BroadcastChannel | null>(null);
  const revisionRef = useRef<Record<TenantSlug, number>>({ nyu: readSharedState('nyu', syncScopeRef.current)?.revision ?? 0 });
  const remindedVisits = useRef(new Set<string>());
  const notifiedAutoClosedVisits = useRef(new Set(Object.values(states).flatMap((state) => state.visits.filter((visit) => visit.status === 'auto_closed').map((visit) => visit.id))));

  const replaceTenantState = useCallback((tenant: TenantSlug, state: DemoState) => {
    const next = { ...statesRef.current, [tenant]: state };
    statesRef.current = next;
    setStates(next);
  }, []);

  const publishTenantState = useCallback((tenant: TenantSlug, state: DemoState) => {
    const revision = Math.max(Date.now() * 1000 + Math.floor(Math.random() * 1000), revisionRef.current[tenant] + 1);
    revisionRef.current[tenant] = revision;
    const envelope: SharedStateEnvelope = { schemaVersion: 1, syncScope: syncScopeRef.current, tenant, revision, state: withoutCurrentUser(state) };
    try { window.localStorage.setItem(sharedStateKey(tenant), JSON.stringify(envelope)); } catch { /* Broadcast still synchronizes open tabs. */ }
    channelRef.current?.postMessage(envelope);
  }, []);

  const applySharedState = useCallback((envelope: SharedStateEnvelope) => {
    if (envelope.schemaVersion !== 1 || envelope.syncScope !== syncScopeRef.current || envelope.tenant !== 'nyu' || envelope.revision <= revisionRef.current[envelope.tenant]) return;
    if (envelope.state.university.slug !== envelope.tenant || !Array.isArray(envelope.state.visits)) return;
    revisionRef.current[envelope.tenant] = envelope.revision;
    replaceTenantState(envelope.tenant, { ...envelope.state, currentUser: statesRef.current[envelope.tenant].currentUser });
  }, [replaceTenantState]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== sharedStateKey('nyu') || !event.newValue) return;
      try { applySharedState(JSON.parse(event.newValue) as SharedStateEnvelope); } catch { /* Ignore malformed external demo state. */ }
    };
    window.addEventListener('storage', handleStorage);
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(`campusfit.demo.shared-state.${syncScopeRef.current}`);
      channelRef.current = channel;
      channel.addEventListener('message', (event: MessageEvent<SharedStateEnvelope>) => applySharedState(event.data));
    }
    return () => {
      window.removeEventListener('storage', handleStorage);
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, [applySharedState]);

  const notify = useCallback((message: string, tone: ToastMessage['tone'] = 'success') => {
    setToast({ id: Date.now(), message, tone });
  }, []);

  useEffect(() => {
    const syncToLaptopClock = () => {
      const now = new Date().toISOString();
      const current = statesRef.current;
      const next = Object.fromEntries(Object.entries(current).map(([tenant, state]) => {
        const clockSynced = { ...state, now };
        const lifecycleUpdated = autoCloseStaleVisits(clockSynced, now);
        const autoClosed = lifecycleUpdated.visits.some((visit, index) => visit.status === 'auto_closed' && state.visits[index]?.status !== 'auto_closed');
        if (autoClosed) publishTenantState(tenant as TenantSlug, lifecycleUpdated);
        return [tenant, lifecycleUpdated];
      })) as Record<TenantSlug, DemoState>;
      statesRef.current = next;
      setStates(next);
    };
    syncToLaptopClock();
    const interval = window.setInterval(syncToLaptopClock, 15_000);
    return () => window.clearInterval(interval);
  }, [publishTenantState]);

  useEffect(() => {
    let reminder: string | undefined;
    let autoClosed = false;
    Object.values(states).forEach((state) => {
      const active = state.visits.find((visit) => visit.userId === state.currentUser.id && visit.status === 'checked_in');
      const reminderKey = active ? `${active.id}:${active.expectedEndAt}` : '';
      if (active && getActiveVisitTiming(active, state.now) === 'grace_period' && !remindedVisits.current.has(reminderKey)) {
        remindedVisits.current.add(reminderKey);
        reminder = 'Are you done with your workout? Check out now or extend your finish time. CampusFit will auto-check you out in 30 minutes.';
      }
      state.visits.filter((visit) => visit.status === 'auto_closed').forEach((visit) => {
        if (!notifiedAutoClosedVisits.current.has(visit.id)) {
          notifiedAutoClosedVisits.current.add(visit.id);
          autoClosed = true;
        }
      });
    });
    if (reminder) {
      notify(reminder, 'warning');
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') new Notification('CampusFit visit', { body: reminder });
    } else if (autoClosed) notify('CampusFit automatically checked you out after the 30-minute grace period.', 'info');
  }, [states, notify]);

  const updateTenant = useCallback((tenant: TenantSlug, updater: (state: DemoState) => DemoState, message?: string) => {
    const updated = updater(statesRef.current[tenant]);
    replaceTenantState(tenant, updated);
    publishTenantState(tenant, updated);
    if (message) notify(message);
  }, [notify, publishTenantState, replaceTenantState]);

  const resetTenant = useCallback((tenant: TenantSlug) => {
    const reset = createDemoState(tenant);
    const session = sessions[tenant];
    const updated = session ? { ...reset, currentUser: session } : reset;
    replaceTenantState(tenant, updated);
    publishTenantState(tenant, updated);
    notify(`${tenant.toUpperCase()} demo data reset`);
  }, [notify, publishTenantState, replaceTenantState, sessions]);

  const signInAs = useCallback((tenant: TenantSlug, user: UserProfile) => {
    if (user.universityId !== states[tenant].university.id) throw new Error('Cross-tenant sign-in denied');
    replaceTenantState(tenant, { ...statesRef.current[tenant], currentUser: user });
    setSessions((current) => ({ ...current, [tenant]: user }));
    try { window.sessionStorage.setItem(sessionKey(tenant), user.id); } catch { /* Session still works in memory. */ }
  }, [replaceTenantState, states]);

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
