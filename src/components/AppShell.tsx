import {
  Bell,
  Building2,
  ChevronDown,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCcw,
  Route,
  Settings2,
  ShieldCheck,
  X,
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDemo } from "../state/DemoContext";
import { useTenant } from "../tenancy/TenantContext";

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { hasRun, resetDemo, resetAllDemoData, tenant } = useDemo();
  const { persona, setPersona, allPersonas, resolution } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();

  if (resolution.status === "blocked" || resolution.status === "not_found") {
    return (
      <main className="access-blocked" id="main-content">
        <span className="brand-mark">R</span>
        <h1>University workspace unavailable</h1>
        <p>{resolution.message}</p>
        <NavLink className="button button-primary" to="/">Return to RoomReady</NavLink>
      </main>
    );
  }

  const isStudent = location.pathname.includes("/student");
  const adminRoot = `/${tenant.slug}/admin`;
  const studentRoot = `/${tenant.slug}/student`;
  const nav = isStudent
    ? [
        { to: studentRoot, label: "Student dashboard", icon: LayoutDashboard, end: true },
        { to: `${studentRoot}/alert`, label: "Room-change alert", icon: Bell },
        { to: `${studentRoot}/alternatives`, label: "Room comparison", icon: Route },
        { to: `${studentRoot}/case`, label: tenant.terminology.caseLabel, icon: ClipboardCheck },
      ]
    : [
        { to: adminRoot, label: "Room-change simulator", icon: GraduationCap, end: true },
        { to: `${adminRoot}/case`, label: tenant.terminology.caseLabel, icon: ClipboardCheck },
        { to: `${adminRoot}/rooms/${tenant.scenario.replacementRoomId}`, label: "Room capabilities", icon: Building2 },
        { to: `${adminRoot}/notifications`, label: "Notifications", icon: ShieldCheck },
        { to: `${adminRoot}/setup`, label: "University setup", icon: Settings2 },
      ];

  const switchPersona = (personaId: string) => {
    const next = allPersonas.find((candidate) => candidate.id === personaId);
    if (!next) return;
    resetDemo();
    setPersona(next.id);
    navigate(`/${next.universitySlug}/${next.role === "student" ? "student" : "admin"}`);
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="mobile-header">
        <NavLink className="brand" to="/">
          <span className="brand-mark">R</span><span>RoomReady</span>
        </NavLink>
        <button
          className="icon-button"
          type="button"
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X /> : <Menu />}
        </button>
      </header>
      <aside className={`sidebar${mobileOpen ? " open" : ""}`}>
        <NavLink className="brand" to="/" onClick={() => setMobileOpen(false)}>
          <span className="brand-mark">R</span><span>RoomReady</span>
        </NavLink>
        <div className="demo-school">
          <span>DEMO UNIVERSITY</span>
          <strong><span className="tenant-logo-text">{tenant.logoText}</span>{tenant.shortName}</strong>
          <small>{tenant.terminology.accessibilityOfficeShort}</small>
        </div>
        <label className="tenant-switcher">
          <span>Competition view</span>
          <select
            aria-label="Switch competition demo persona"
            value={persona?.id ?? ""}
            onChange={(event) => switchPersona(event.target.value)}
          >
            {allPersonas.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>
        <nav aria-label="Main navigation">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              end={end}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => (isActive ? "active" : undefined)}
            >
              <Icon aria-hidden="true" size={18} />
              <span>{label}</span>
              {label === "Room-change alert" && hasRun && (
                <span className="nav-dot" aria-label="New">1</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button type="button" className="reset-button" onClick={resetDemo}>
            <RefreshCcw aria-hidden="true" size={16} /> Reset {tenant.shortName} demo
          </button>
          {!isStudent && (
            <button type="button" className="reset-button" onClick={resetAllDemoData}>
              <RefreshCcw aria-hidden="true" size={16} /> Reset All Demo Data
            </button>
          )}
          <div className="user-card">
            <span className="avatar">
              {persona?.fullName.split(" ").map((part) => part[0]).join("") ?? "RR"}
            </span>
            <span><strong>{persona?.fullName}</strong><small>{persona?.label}</small></span>
            <ChevronDown aria-hidden="true" size={16} />
          </div>
          <NavLink className="home-link" to={`/${tenant.slug}`}>
            <LogOut aria-hidden="true" size={16} /> Exit workspace
          </NavLink>
        </div>
      </aside>
      {mobileOpen && (
        <button className="sidebar-scrim" type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />
      )}
      <main id="main-content" className="app-main" tabIndex={-1}>
        <div className="synthetic-banner">{tenant.syntheticDataNotice}</div>
        <Outlet />
      </main>
    </div>
  );
}
