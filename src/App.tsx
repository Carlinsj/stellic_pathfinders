import { Navigate, Route, Routes } from 'react-router-dom';
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

export default function App() {
  return <Routes>
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
  </Routes>;
}
