import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { useAuthStore } from "./store/authStore";

import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Dashboard } from "./pages/Dashboard";
import { Admin } from "./pages/Admin";

import { TrainerPage } from "./features/trainer/TrainerPage";
import { PerformancePage } from "./features/performance/PerformancePage";
import { DietPage } from "./features/diet/DietPage";
import { ChatPage } from "./features/chat/ChatPage";
import { HabitsPage } from "./features/habits/HabitsPage";
import { IotPage } from "./features/iot/IotPage";
import { RecoPage } from "./features/reco/RecoPage";

function App() {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="trainer" element={<TrainerPage />} />
        <Route path="performance" element={<PerformancePage />} />
        <Route path="diet" element={<DietPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="habits" element={<HabitsPage />} />
        <Route path="iot" element={<IotPage />} />
        <Route path="reco" element={<RecoPage />} />
        <Route path="admin" element={<Admin />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
