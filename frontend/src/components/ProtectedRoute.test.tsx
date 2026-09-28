import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "./ProtectedRoute";
import { useAuthStore } from "../store/authStore";

const completeProfile = {
  age: 30, sex: "male" as const, height_cm: 180, weight_kg: 80,
  goal: "maintain" as const, activity_level: "moderate" as const,
  diet_pref: "veg" as const, bmi: 24.7,
};

function renderAt(requireProfile = false) {
  return render(
    <MemoryRouter initialEntries={["/secret"]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/onboarding" element={<div>Onboarding Page</div>} />
        <Route
          path="/secret"
          element={
            <ProtectedRoute requireProfile={requireProfile}>
              <div>Secret Content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useAuthStore.setState({ user: null, loading: false, initialized: false });
});

describe("ProtectedRoute", () => {
  it("shows a loader until auth is initialized", () => {
    renderAt();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("redirects to /login when initialized and unauthenticated", () => {
    useAuthStore.setState({ initialized: true, user: null });
    renderAt();
    expect(screen.getByText("Login Page")).toBeInTheDocument();
    expect(screen.queryByText("Secret Content")).not.toBeInTheDocument();
  });

  it("renders children when authenticated", () => {
    useAuthStore.setState({
      initialized: true,
      user: { id: 1, email: "a@b.com", role: "user", profile: null },
    });
    renderAt();
    expect(screen.getByText("Secret Content")).toBeInTheDocument();
  });

  it("sends incomplete regular users to onboarding", () => {
    useAuthStore.setState({ initialized: true, user: { id: 1, email: "a@b.com", role: "user", profile: null } });
    renderAt(true);
    expect(screen.getByText("Onboarding Page")).toBeInTheDocument();
  });

  it("allows complete users and exempts admins", () => {
    useAuthStore.setState({ initialized: true, user: { id: 1, email: "a@b.com", role: "user", profile: completeProfile } });
    const view = renderAt(true);
    expect(screen.getByText("Secret Content")).toBeInTheDocument();
    view.unmount();
    useAuthStore.setState({ initialized: true, user: { id: 2, email: "admin@b.com", role: "admin", profile: null } });
    renderAt(true);
    expect(screen.getByText("Secret Content")).toBeInTheDocument();
  });
});
