import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { AuthenticatedGuard, RoleGuard, TenantGuard } from './data/TenantContext';
import { ActivityPage } from './pages/ActivityPage';
import { AdminPage } from './pages/AdminPage';
import { DemoControlsPage } from './pages/DemoControlsPage';
import { FacilitiesPage } from './pages/FacilitiesPage';
import { FacilityDetailPage } from './pages/FacilityDetailPage';
import { HistoryPage } from './pages/HistoryPage';
import { HomePage } from './pages/HomePage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PlanPage } from './pages/PlanPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { StaffPage } from './pages/StaffPage';

const titleForPath = (pathname: string): string => {
  if (pathname === '/') return 'CampusFit — plan a better workout';
  if (pathname === '/privacy') return 'Privacy · CampusFit';
  if (pathname.endsWith('/staff-login')) return 'Staff demo login · CampusFit';
  if (pathname.endsWith('/login')) return 'Student demo login · CampusFit';
  if (/\/facilities\/[^/]+$/.test(pathname)) return 'Facility details · CampusFit';
  if (pathname.endsWith('/facilities')) return 'Facilities · CampusFit';
  if (pathname.endsWith('/home')) return 'Student dashboard · CampusFit';
  if (pathname.endsWith('/plan')) return 'Plan a visit · CampusFit';
  if (pathname.endsWith('/activity')) return 'Activity demand · CampusFit';
  if (pathname.endsWith('/history')) return 'Visit history · CampusFit';
  if (pathname.endsWith('/staff')) return 'Facility operations · CampusFit';
  if (pathname.endsWith('/admin')) return 'University settings · CampusFit';
  if (pathname.endsWith('/demo')) return 'Demo controls · CampusFit';
  return 'Page not found · CampusFit';
};

export default function App() {
  const location = useLocation();
  useEffect(() => { document.title = titleForPath(location.pathname); }, [location.pathname]);

  return <><a className="skip-link" href="#main-content">Skip to main content</a><Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/privacy" element={<PrivacyPage />} />
    <Route path="/nyu/login" element={<LoginPage audience="student" />} />
    <Route path="/nyu/staff-login" element={<LoginPage audience="staff" />} />
    <Route path="/nyu" element={<TenantGuard><AuthenticatedGuard><AppShell /></AuthenticatedGuard></TenantGuard>}>
      <Route index element={<Navigate to="home" replace />} />
      <Route path="home" element={<RoleGuard area="student"><HomePage /></RoleGuard>} />
      <Route path="facilities" element={<RoleGuard area="student"><FacilitiesPage /></RoleGuard>} />
      <Route path="facilities/:facilityId" element={<RoleGuard area="student"><FacilityDetailPage /></RoleGuard>} />
      <Route path="plan" element={<RoleGuard area="student"><PlanPage /></RoleGuard>} />
      <Route path="activity" element={<RoleGuard area="student"><ActivityPage /></RoleGuard>} />
      <Route path="history" element={<RoleGuard area="student"><HistoryPage /></RoleGuard>} />
      <Route path="staff" element={<RoleGuard area="staff"><StaffPage /></RoleGuard>} />
      <Route path="admin" element={<RoleGuard area="admin"><AdminPage /></RoleGuard>} />
      <Route path="demo" element={<RoleGuard area="demo"><DemoControlsPage /></RoleGuard>} />
    </Route>
    <Route path="*" element={<NotFoundPage />} />
  </Routes></>;
}
