import { createContext, useContext, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LoadingSkeleton } from '../components/ui';
import type { DemoState, TenantSlug } from '../domain/types';
import { canAccessArea, defaultRouteForRole, type AccessArea } from '../services/accessControl';
import { useCampusFit } from './CampusFitContext';

interface TenantContextValue { tenant: TenantSlug; state: DemoState }
const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantGuard({ children }: { children: ReactNode }) {
  const { states } = useCampusFit();
  const tenant: TenantSlug = 'nyu';
  const value: TenantContextValue = { tenant, state: states[tenant] };
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function AuthenticatedGuard({ children }: { children: ReactNode }) {
  const { tenant } = useTenant();
  const { sessions, sessionLoading } = useCampusFit();
  const location = useLocation();
  if (sessionLoading[tenant]) {
    return <main id="main-content" className="page" tabIndex={-1}>
      <LoadingSkeleton rows={5} label="Loading current CampusFit data" />
    </main>;
  }
  if (!sessions[tenant]) {
    const staffDestination = /\/(staff|admin|demo)(?:\/|$)/.test(location.pathname);
    return <Navigate to={`/${tenant}/${staffDestination ? 'staff-login' : 'login'}`} replace />;
  }
  return children;
}

export function RoleGuard({ area, children }: { area: AccessArea; children: ReactNode }) {
  const { tenant } = useTenant();
  const { sessions } = useCampusFit();
  const user = sessions[tenant];
  if (!user) return <Navigate to={`/${tenant}/${area === 'student' ? 'login' : 'staff-login'}`} replace />;
  if (!canAccessArea(user.role, area)) return <Navigate to={`/${tenant}/${defaultRouteForRole(user.role)}`} replace />;
  return children;
}

export const useTenant = (): TenantContextValue => {
  const context = useContext(TenantContext);
  if (!context) throw new Error('useTenant must be used inside TenantGuard');
  return context;
};
