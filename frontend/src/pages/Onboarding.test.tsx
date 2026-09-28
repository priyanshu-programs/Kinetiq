import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "../store/authStore";
import { Onboarding } from "./Onboarding";

beforeEach(() => {
  useAuthStore.setState({
    initialized: true,
    user: { id: 1, email: "new@example.com", role: "user", profile: null },
  });
});

describe("Onboarding", () => {
  it("requires each step and saves the completed profile", async () => {
    const saveProfile = vi.fn().mockResolvedValue(undefined);
    useAuthStore.setState({ saveProfile });
    render(
      <MemoryRouter initialEntries={["/onboarding"]}>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/app" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Age is required.")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("spinbutton", { name: "Age" }), { target: { value: "30" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Sex" }), { target: { value: "male" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Height (cm)" }), { target: { value: "180" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Weight (kg)" }), { target: { value: "81" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    fireEvent.change(screen.getByRole("combobox", { name: "Goal" }), { target: { value: "maintain" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Activity level" }), { target: { value: "moderate" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    fireEvent.change(screen.getByRole("combobox", { name: "Diet preference" }), { target: { value: "veg" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Review your details")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Finish setup" }));

    await waitFor(() => expect(saveProfile).toHaveBeenCalledWith({
      age: 30, sex: "male", height_cm: 180, weight_kg: 81,
      goal: "maintain", activity_level: "moderate", diet_pref: "veg",
    }));
    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
  });
});
