import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "./ProtectedRoute";
import { useAuthStore } from "../store/authStore";

function renderAt() {
  return render(
    <MemoryRouter initialEntries={["/secret"]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route
          path="/secret"
          element={
            <ProtectedRoute>
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
});
