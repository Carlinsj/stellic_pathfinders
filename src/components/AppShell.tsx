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
  ShieldCheck,
  X,
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useDemo } from "../state/DemoContext";

const nav = [
  { to: "/app", label: "Student view", icon: LayoutDashboard, end: true },
  { to: "/app/alert", label: "Room-change alert", icon: Bell },
  { to: "/app/alternatives", label: "Room comparison", icon: Route },
  { to: "/app/case", label: "Remediation case", icon: ClipboardCheck },
  { to: "/admin/simulator", label: "Demo simulator", icon: GraduationCap },
  { to: "/rooms/room-815", label: "Room capabilities", icon: Building2 },
  { to: "/notifications", label: "Notifications", icon: ShieldCheck },
];

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { hasRun, resetDemo } = useDemo();

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="mobile-header">
        <NavLink className="brand" to="/">
          <span className="brand-mark">R</span>
          <span>RoomReady</span>
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
          <span className="brand-mark">R</span>
          <span>RoomReady</span>
        </NavLink>
        <div className="demo-school">
          <span>DEMO UNIVERSITY</span>
          <strong>MetroTech</strong>
        </div>
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
                <span className="nav-dot" aria-label="New">
                  1
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button type="button" className="reset-button" onClick={resetDemo}>
            <RefreshCcw aria-hidden="true" size={16} />
            Reset demo
          </button>
          <div className="user-card">
            <span className="avatar">AO</span>
            <span>
              <strong>Alex Ortiz</strong>
              <small>Demo administrator</small>
            </span>
            <ChevronDown aria-hidden="true" size={16} />
          </div>
          <NavLink className="home-link" to="/">
            <LogOut aria-hidden="true" size={16} />
            Exit to overview
          </NavLink>
        </div>
      </aside>
      {mobileOpen && (
        <button
          className="sidebar-scrim"
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <main id="main-content" className="app-main" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
