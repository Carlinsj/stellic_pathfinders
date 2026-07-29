import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { LandingPage } from "./pages/LandingPage";
import { StudentDashboard } from "./pages/StudentDashboard";
import { RoomChangeAlert } from "./pages/RoomChangeAlert";
import { AlternativesPage } from "./pages/AlternativesPage";
import { CasePage } from "./pages/CasePage";
import { SimulatorPage } from "./pages/SimulatorPage";
import { RoomPage } from "./pages/RoomPage";
import { NotificationsPage } from "./pages/NotificationsPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<AppShell />}>
        <Route path="/app" element={<StudentDashboard />} />
        <Route path="/app/alert" element={<RoomChangeAlert />} />
        <Route path="/app/alternatives" element={<AlternativesPage />} />
        <Route path="/app/case" element={<CasePage />} />
        <Route path="/admin/simulator" element={<SimulatorPage />} />
        <Route path="/rooms/:roomId" element={<RoomPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
