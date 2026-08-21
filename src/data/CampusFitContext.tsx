import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { DemoState, TenantSlug, UserProfile } from '../domain/types';
import { createDemoState, demoAccounts } from './seed';
import { autoCloseStaleVisits } from '../services/visitLifecycle';
import { getActiveVisitTiming } from '../services/visitReminders';
import { campusFitApi, CampusFitApiError } from '../services/campusFitApi';
import { applyDemoAction, type DemoAction } from '../services/demoOperations';
import { mergeFacilityParticipationTrackers } from '../services/participationTracker';

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
  accounts: Record<TenantSlug, UserProfile[]>;
  accountsLoading: boolean;
  sessionLoading: Record<TenantSlug, boolean>;
  backendStatus: 'checking' | 'connected' | 'local';
  updateTenant: (tenant: TenantSlug, updater: (state: DemoState) => DemoState, message?: string) => void;
  resetTenant: (tenant: TenantSlug) => Promise<void>;
  signInAs: (tenant: TenantSlug, user: UserProfile) => Promise<void>;
  signOut: (tenant: TenantSlug) => Promise<void>;
  refreshParticipation: (tenant: TenantSlug, facilityId: string, at?: string) => Promise<void>;
  runDemoAction: (tenant: TenantSlug, action: DemoAction, message: string) => Promise<void>;
  toast?: ToastMessage;
  dismissToast: () => void;
  notify: (message: string, tone?: ToastMessage['tone']) => void;
}

const CampusFitContext = createContext<CampusFitContextValue | null>(null);

const sessionKey = (tenant: TenantSlug): string => `campusfit.demo.session.${tenant}`;
const sharedStateKey = (tenant: TenantSlug): string => `campusfit.demo.shared.${tenant}`;
const SYNC_SCOPE_KEY = 'campusfit.demo.sync-scope';
const CURRENT_PARTICIPATION_REFRESH_MS = 15_000;

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
  const apiUser = campusFitApi.getCachedUser(tenant);
  if (apiUser) return apiUser;
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
  const [accounts, setAccounts] = useState<Record<TenantSlug, UserProfile[]>>(demoAccounts);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState<Record<TenantSlug, boolean>>({ nyu: false });
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'local'>(campusFitApi.isEnabled ? 'checking' : 'local');
  const [toast, setToast] = useState<ToastMessage>();
  const statesRef = useRef(states);
  const syncScopeRef = useRef(readSyncScope());
  const channelRef = useRef<BroadcastChannel | null>(null);
  const revisionRef = useRef<Record<TenantSlug, number>>({ nyu: readSharedState('nyu', syncScopeRef.current)?.revision ?? 0 });
  const remindedVisits = useRef(new Set<string>());
  const notifiedAutoClosedVisits = useRef(new Set(Object.values(states).flatMap((state) => state.visits.filter((visit) => visit.status === 'auto_closed').map((visit) => visit.id))));
  const apiLifecycleRefreshes = useRef(new Set<TenantSlug>());
  const sessionGenerationRef = useRef<Record<TenantSlug, number>>({ nyu: 0 });

  const replaceTenantState = useCallback((tenant: TenantSlug, state: DemoState) => {
    const next = { ...statesRef.current, [tenant]: state };
    statesRef.current = next;
    setStates(next);
  }, []);

  const publishTenantState = useCallback((tenant: TenantSlug, state: DemoState) => {
    if (state.dataSource === 'api') return;
    const revision = Math.max(Date.now() * 1000 + Math.floor(Math.random() * 1000), revisionRef.current[tenant] + 1);
    revisionRef.current[tenant] = revision;
    const envelope: SharedStateEnvelope = { schemaVersion: 1, syncScope: syncScopeRef.current, tenant, revision, state: withoutCurrentUser(state) };
    try { window.localStorage.setItem(sharedStateKey(tenant), JSON.stringify(envelope)); } catch { /* Broadcast still synchronizes open tabs. */ }
    channelRef.current?.postMessage(envelope);
  }, []);

  const refreshTenantFromApi = useCallback(async (tenant: TenantSlug, shouldApply: () => boolean = () => true) => {
    const state = await campusFitApi.loadTenantState(tenant);
    if (!shouldApply()) return state;
    replaceTenantState(tenant, state);
    setSessions((current) => ({ ...current, [tenant]: state.currentUser }));
    setBackendStatus('connected');
    return state;
  }, [replaceTenantState]);

  useEffect(() => {
    if (!campusFitApi.isEnabled) return;
    let cancelled = false;
    campusFitApi.listDemoAccounts('nyu')
      .then((loaded) => {
        if (cancelled) return;
        setAccounts({ nyu: loaded });
        setBackendStatus('connected');
      })
      .catch(() => {
        if (cancelled) return;
        setBackendStatus('local');
      })
      .finally(() => { if (!cancelled) setAccountsLoading(false); });

    if (campusFitApi.hasSession('nyu')) {
      refreshTenantFromApi('nyu').catch(async () => {
        await campusFitApi.signOut('nyu');
        if (!cancelled) setSessions({ nyu: undefined });
      }).finally(() => { if (!cancelled) setSessionLoading({ nyu: false }); });
    }
    return () => { cancelled = true; };
  }, [refreshTenantFromApi]);

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
      const staleApiTenants: TenantSlug[] = [];
      const next = Object.fromEntries(Object.entries(current).map(([tenant, state]) => {
        const clockSynced = { ...state, now };
        const lifecycleUpdated = state.dataSource === 'api' ? clockSynced : autoCloseStaleVisits(clockSynced, now);
        if (state.dataSource === 'api' && state.visits.some((visit) =>
          visit.userId === state.currentUser.id &&
          visit.status === 'checked_in' &&
          visit.autoCloseAt &&
          Date.parse(visit.autoCloseAt) <= Date.parse(now))) {
          staleApiTenants.push(tenant as TenantSlug);
        }
        const autoClosed = lifecycleUpdated.visits.some((visit, index) => visit.status === 'auto_closed' && state.visits[index]?.status !== 'auto_closed');
        if (autoClosed) publishTenantState(tenant as TenantSlug, lifecycleUpdated);
        return [tenant, lifecycleUpdated];
      })) as Record<TenantSlug, DemoState>;
      statesRef.current = next;
      setStates(next);
      staleApiTenants.forEach((tenant) => {
        if (apiLifecycleRefreshes.current.has(tenant)) return;
        apiLifecycleRefreshes.current.add(tenant);
        void refreshTenantFromApi(tenant)
          .catch(() => undefined)
          .finally(() => apiLifecycleRefreshes.current.delete(tenant));
      });
    };
    syncToLaptopClock();
    const interval = window.setInterval(syncToLaptopClock, 15_000);
    return () => window.clearInterval(interval);
  }, [publishTenantState, refreshTenantFromApi]);

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
    const previous = statesRef.current[tenant];
    const updated = updater(previous);
    replaceTenantState(tenant, updated);
    publishTenantState(tenant, updated);
    if (message) notify(message);
    if (previous.dataSource === 'api') {
      void campusFitApi.syncTenantChange(tenant, previous, updated)
        .then((changed) => changed ? refreshTenantFromApi(tenant) : undefined)
        .catch((error) => {
          replaceTenantState(tenant, previous);
          notify(error instanceof Error ? error.message : 'CampusFit could not save that change', 'warning');
        });
    }
  }, [notify, publishTenantState, refreshTenantFromApi, replaceTenantState]);

  const resetTenant = useCallback(async (tenant: TenantSlug) => {
    if (statesRef.current[tenant].dataSource === 'api') {
      try {
        await campusFitApi.resetDemo(tenant);
        await refreshTenantFromApi(tenant);
        notify(`${tenant.toUpperCase()} demo data reset`);
        return;
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Demo reset failed', 'warning');
        return;
      }
    }
    const reset = createDemoState(tenant);
    const session = sessions[tenant];
    const updated = session ? { ...reset, currentUser: session } : reset;
    replaceTenantState(tenant, updated);
    publishTenantState(tenant, updated);
    notify(`${tenant.toUpperCase()} demo data reset`);
  }, [notify, publishTenantState, refreshTenantFromApi, replaceTenantState, sessions]);

  const signInAs = useCallback(async (tenant: TenantSlug, user: UserProfile) => {
    const sessionGeneration = ++sessionGenerationRef.current[tenant];
    const localAccount = demoAccounts[tenant].find((account) => account.email === user.email || account.id === user.id);
    const immediateUser = localAccount ?? user;
    if (immediateUser.universityId !== statesRef.current[tenant].university.id) throw new Error('Cross-tenant sign-in denied');

    // The bundled tenant state is ready synchronously, so route immediately and
    // replace it with authoritative API data once the background session is ready.
    replaceTenantState(tenant, { ...statesRef.current[tenant], currentUser: immediateUser, dataSource: 'local' });
    setSessions((current) => ({ ...current, [tenant]: immediateUser }));
    setSessionLoading((current) => ({ ...current, [tenant]: false }));
    try { window.sessionStorage.setItem(sessionKey(tenant), immediateUser.id); } catch { /* Session still works in memory. */ }

    if (!campusFitApi.isEnabled) return;
    setBackendStatus('checking');
    void campusFitApi.signInDemo(tenant, user.id)
      .then(async (authenticatedUser) => {
        if (sessionGenerationRef.current[tenant] !== sessionGeneration) {
          await campusFitApi.signOut(tenant);
          return;
        }
        setSessions((current) => ({ ...current, [tenant]: authenticatedUser }));
        await refreshTenantFromApi(tenant, () => sessionGenerationRef.current[tenant] === sessionGeneration);
      })
      .catch(async (error) => {
        if (sessionGenerationRef.current[tenant] !== sessionGeneration) return;
        if (campusFitApi.mode === 'remote') {
          await campusFitApi.signOut(tenant);
          setSessions((current) => ({ ...current, [tenant]: undefined }));
          try { window.sessionStorage.removeItem(sessionKey(tenant)); } catch { /* Memory session is also cleared. */ }
          notify(error instanceof Error ? error.message : 'CampusFit could not start this session.', 'warning');
          return;
        }
        setBackendStatus('local');
        notify(error instanceof CampusFitApiError ? 'Backend unavailable — continuing with the local deterministic demo' : 'Could not start the backend session — using local demo data', 'warning');
      });
  }, [notify, refreshTenantFromApi, replaceTenantState]);

  const signOut = useCallback(async (tenant: TenantSlug) => {
    sessionGenerationRef.current[tenant] += 1;
    await campusFitApi.signOut(tenant);
    setSessions((current) => ({ ...current, [tenant]: undefined }));
    setSessionLoading((current) => ({ ...current, [tenant]: false }));
    try { window.sessionStorage.removeItem(sessionKey(tenant)); } catch { /* Memory session is still cleared. */ }
    setToast(undefined);
  }, []);

  const refreshParticipation = useCallback(async (tenant: TenantSlug, facilityId: string, at?: string) => {
    if (statesRef.current[tenant].dataSource !== 'api') return;
    try {
      const tracker = await campusFitApi.getParticipation(tenant, facilityId, at);
      const current = statesRef.current[tenant];
      const participationTrackers = mergeFacilityParticipationTrackers(current.participationTrackers ?? [], [tracker]);
      replaceTenantState(tenant, { ...current, participationTrackers });
    } catch {
      // The synchronous service fallback remains available for transient failures.
    }
  }, [replaceTenantState]);

  const refreshCurrentParticipation = useCallback(async (tenant: TenantSlug) => {
    const snapshot = statesRef.current[tenant];
    if (snapshot.dataSource !== 'api') return;
    const refreshed = (await Promise.all(snapshot.facilities.map((facility) =>
      campusFitApi.getParticipation(tenant, facility.id, snapshot.now).catch(() => undefined)
    ))).filter((tracker): tracker is NonNullable<typeof tracker> => Boolean(tracker));
    if (refreshed.length === 0) return;
    const current = statesRef.current[tenant];
    if (current.dataSource !== 'api') return;
    const participationTrackers = mergeFacilityParticipationTrackers(current.participationTrackers ?? [], refreshed);
    replaceTenantState(tenant, { ...current, participationTrackers });
  }, [replaceTenantState]);

  const nyuSessionId = sessions.nyu?.id;
  const nyuDataSource = states.nyu.dataSource;
  useEffect(() => {
    if (!nyuSessionId || nyuDataSource !== 'api') return;
    let disposed = false;
    let requestInFlight = false;
    const refresh = () => {
      if (disposed || requestInFlight || document.visibilityState === 'hidden') return;
      requestInFlight = true;
      void refreshCurrentParticipation('nyu').finally(() => { requestInFlight = false; });
    };
    const handleVisibility = () => { if (document.visibilityState === 'visible') refresh(); };
    refresh();
    const interval = window.setInterval(refresh, CURRENT_PARTICIPATION_REFRESH_MS);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      disposed = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [nyuDataSource, nyuSessionId, refreshCurrentParticipation]);

  const runDemoAction = useCallback(async (tenant: TenantSlug, action: DemoAction, message: string) => {
    const current = statesRef.current[tenant];
    if (current.dataSource === 'api') {
      try {
        await campusFitApi.runDemoAction(tenant, action);
        await refreshTenantFromApi(tenant);
        notify(message);
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Demo action failed', 'warning');
      }
      return;
    }
    updateTenant(tenant, (state) => applyDemoAction(state, tenant, action), message);
  }, [notify, refreshTenantFromApi, updateTenant]);

  const value = useMemo(() => ({
    states, sessions, accounts, accountsLoading, sessionLoading, backendStatus, updateTenant, resetTenant, signInAs, signOut,
    refreshParticipation, runDemoAction, toast, dismissToast: () => setToast(undefined), notify
  }), [states, sessions, accounts, accountsLoading, sessionLoading, backendStatus, updateTenant, resetTenant, signInAs, signOut, refreshParticipation, runDemoAction, toast, notify]);

  return <CampusFitContext.Provider value={value}>{children}</CampusFitContext.Provider>;
}

export const useCampusFit = (): CampusFitContextValue => {
  const context = useContext(CampusFitContext);
  if (!context) throw new Error('useCampusFit must be used inside CampusFitProvider');
  return context;
};
