import { Suspense, lazy, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { useAuthStore } from "./store/authStore";

import { LandingPage } from "./features/landing/LandingPage";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Dashboard } from "./pages/Dashboard";

// Code-split the heavy feature routes (MediaPipe, Recharts, WebSocket) so they
// load on demand instead of bloating the initial bundle.
const Admin = lazy(() => import("./pages/Admin").then((m) => ({ default: m.Admin })));
const TrainerPage = lazy(() =>
  import("./features/trainer/TrainerPage").then((m) => ({ default: m.TrainerPage })),
);
const PerformancePage = lazy(() =>
  import("./features/performance/PerformancePage").then((m) => ({ default: m.PerformancePage })),
);
const DietPage = lazy(() =>
  import("./features/diet/DietPage").then((m) => ({ default: m.DietPage })),
);
const ChatPage = lazy(() =>
  import("./features/chat/ChatPage").then((m) => ({ default: m.ChatPage })),
);
const HabitsPage = lazy(() =>
  import("./features/habits/HabitsPage").then((m) => ({ default: m.HabitsPage })),
);
const IotPage = lazy(() =>
  import("./features/iot/IotPage").then((m) => ({ default: m.IotPage })),
);
const RecoPage = lazy(() =>
  import("./features/reco/RecoPage").then((m) => ({ default: m.RecoPage })),
);

function App() {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <Suspense
      fallback={<p className="py-12 text-center text-ink-3">Loading…</p>}
    >
    <Routes>
      <Route path="/" element={<LandingPage />} />
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
    </Suspense>
  );
}

export default App;
