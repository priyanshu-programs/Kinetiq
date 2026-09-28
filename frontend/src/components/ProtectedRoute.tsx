import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { profileComplete } from "../features/profile/profileForm";

import { useAuthStore } from "../store/authStore";

export function ProtectedRoute({ children, requireProfile = false }: { children: ReactNode; requireProfile?: boolean }) {
  const { user, initialized } = useAuthStore();

  if (!initialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas text-sm text-ink-3">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireProfile && user.role !== "admin" && !profileComplete(user.profile)) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
