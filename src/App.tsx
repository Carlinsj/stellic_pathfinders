import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { AlternativesPage } from "./pages/AlternativesPage";
import { CasePage } from "./pages/CasePage";
import { LandingPage } from "./pages/LandingPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { RoomChangeAlert } from "./pages/RoomChangeAlert";
import { RoomPage } from "./pages/RoomPage";
import { SetupWizardPage } from "./pages/SetupWizardPage";
import { SimulatorPage } from "./pages/SimulatorPage";
import { StudentDashboard } from "./pages/StudentDashboard";
import { TenantLandingPage } from "./pages/TenantLandingPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/:tenantSlug" element={<TenantLandingPage />} />
      <Route path="/:tenantSlug" element={<AppShell />}>
        <Route path="student" element={<StudentDashboard />} />
        <Route path="student/alert" element={<RoomChangeAlert />} />
        <Route path="student/alternatives" element={<AlternativesPage />} />
        <Route path="student/case" element={<CasePage />} />
        <Route path="admin" element={<SimulatorPage />} />
        <Route path="admin/case" element={<CasePage />} />
        <Route path="admin/rooms/:roomId" element={<RoomPage />} />
        <Route path="admin/notifications" element={<NotificationsPage />} />
        <Route path="admin/setup" element={<SetupWizardPage />} />
      </Route>

      <Route path="/app/*" element={<Navigate to="/nyu/student" replace />} />
      <Route path="/admin/simulator" element={<Navigate to="/nyu/admin" replace />} />
      <Route path="/rooms/:roomId" element={<Navigate to="/nyu/admin" replace />} />
      <Route path="/notifications" element={<Navigate to="/nyu/admin/notifications" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
