import { Activity, CalendarDays, Command, Home, LockKeyhole, LogOut, MapPin, Settings2, ShieldCheck, SlidersHorizontal, UserRound } from 'lucide-react';
import { useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useCampusFit } from '../data/CampusFitContext';
import { useTenant } from '../data/TenantContext';
import { initials } from '../lib/format';
import { canAccessArea, defaultRouteForRole, isStaffPortalRole, roleLabels, type AccessArea } from '../services/accessControl';
import { Brand } from './Brand';

const studentNavItems = [
  { path: 'home', label: 'Home', icon: Home },
  { path: 'facilities', label: 'Gyms', icon: MapPin },
  { path: 'plan', label: 'Plan', icon: CalendarDays },
  { path: 'activity', label: 'Explore', icon: Activity },
  { path: 'history', label: 'Visits', icon: UserRound }
];

const staffNavItems: Array<{ path: string; label: string; mobileLabel: string; icon: typeof ShieldCheck; area: AccessArea }> = [
  { path: 'staff', label: 'Facility operations', mobileLabel: 'Operations', icon: ShieldCheck, area: 'staff' },
  { path: 'admin', label: 'University settings', mobileLabel: 'Settings', icon: Settings2, area: 'admin' },
  { path: 'demo', label: 'Demo controls', mobileLabel: 'Demo', icon: SlidersHorizontal, area: 'demo' }
];

export function AppShell() {
  const { tenant, state } = useTenant();
  const { sessions, signOut, toast, dismissToast } = useCampusFit();
  const location = useLocation();
  const navigate = useNavigate();
  const user = sessions[tenant] ?? state.currentUser;
  const staffPortal = isStaffPortalRole(user.role);
  const navigation = staffPortal ? staffNavItems.filter((item) => canAccessArea(user.role, item.area)) : studentNavItems;
  const showBottomNavigation = !staffPortal || navigation.length > 1;
  const startPath = `/${tenant}/${defaultRouteForRole(user.role)}`;
  const currentSection = navigation.find((item) => location.pathname.endsWith(`/${item.path}`))?.label ?? (staffPortal ? 'Operations console' : 'CampusFit');

  useEffect(() => { window.scrollTo({ top: 0 }); }, [location.pathname]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(dismissToast, 3500);
    return () => window.clearTimeout(timer);
  }, [toast, dismissToast]);

  const handleSignOut = () => {
    void signOut(tenant);
    navigate(`/${tenant}/${staffPortal ? 'staff-login' : 'login'}`);
  };

  const university = state.university;
  return <div className={`app-shell ${staffPortal ? 'app-shell--staff' : 'app-shell--student'}`} style={{
    '--tenant-primary': university.primaryColor,
    '--tenant-secondary': university.secondaryColor,
    '--tenant-accent': university.accentColor,
    '--color-accent': university.primaryColor,
    '--color-accent-soft': university.secondaryColor,
    '--violet': university.primaryColor,
    '--violet-soft': university.secondaryColor
  } as React.CSSProperties}>
    {staffPortal ? <aside className="desktop-sidebar">
      <Brand to={startPath} inverted />
      <div className="tenant-lockup"><span className="tenant-mark">{university.mark}</span><div><small>{staffPortal ? `${university.shortName} Athletics` : 'Campus recreation'}</small><strong>{staffPortal ? 'Operations console' : university.shortName}</strong></div></div>
      <nav aria-label={staffPortal ? 'Staff navigation' : 'Primary navigation'}>{navigation.map(({ path, label, icon: Icon }) => <NavLink key={path} to={`/${tenant}/${path}`}><Icon size={19} /><span>{label}</span></NavLink>)}</nav>
      {staffPortal ? <div className="staff-access-note"><ShieldCheck /><span><strong>Protected operations</strong><small>Role-based access · Demo</small></span></div> : null}
      <div className="sidebar-user"><span>{initials(user.fullName)}</span><div><strong>{user.fullName}</strong><small>{roleLabels[user.role]}</small></div><button type="button" onClick={handleSignOut} aria-label="Sign out"><LogOut /></button></div>
    </aside> : null}
    <div className="app-main-wrap">
      {staffPortal ? <header className="admin-console-header"><div className="admin-console-title"><span><Command />{university.shortName} Athletics operations</span><strong>{currentSection}</strong></div><div className="admin-console-session"><span className="admin-system-state"><i />Demo services online</span><span className="admin-role-chip"><LockKeyhole />{roleLabels[user.role]}</span><button type="button" onClick={handleSignOut} aria-label="Sign out of staff portal"><LogOut /></button></div></header> : <header className="student-app-header"><div className="student-header-inner"><Brand to={startPath} /><span className="nyu-identity">NYU</span><nav className="student-desktop-nav" aria-label="Primary navigation">{navigation.map(({ path, label, icon: Icon }) => <NavLink key={path} to={`/${tenant}/${path}`}><Icon size={17} /><span>{label}</span></NavLink>)}</nav><div className="student-header-actions"><button type="button" className="student-profile-action" onClick={handleSignOut} aria-label={`Sign out ${user.fullName}`}><span>{initials(user.fullName)}</span><div><strong>{user.fullName.split(' ')[0]}</strong><small>NYU student</small></div><LogOut /></button></div></div></header>}
      <main id="main-content" className="app-main" tabIndex={-1}><Outlet /></main>
      {showBottomNavigation ? <nav className="bottom-nav" aria-label={staffPortal ? 'Staff mobile navigation' : 'Mobile navigation'} style={{ '--nav-count': navigation.length } as React.CSSProperties}>{navigation.map((item) => { const Icon = item.icon; const label = staffPortal && 'mobileLabel' in item && typeof item.mobileLabel === 'string' ? item.mobileLabel : item.label; return <NavLink key={item.path} to={`/${tenant}/${item.path}`} aria-label={item.label}><Icon size={21} /><span>{label}</span></NavLink>; })}</nav> : null}
    </div>
    {toast ? <div className={`toast toast--${toast.tone}`} role="status"><ShieldCheck size={18} />{toast.message}<button onClick={dismissToast} aria-label="Dismiss notification">×</button></div> : null}
  </div>;
}
