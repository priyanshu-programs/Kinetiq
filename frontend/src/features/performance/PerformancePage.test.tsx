import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { PerformancePage } from "./PerformancePage";
import { api } from "../../lib/api";

vi.mock("../../lib/api", () => ({
  api: { get: vi.fn() },
}));

const mockApi = vi.mocked(api);

describe("PerformancePage", () => {
  it("shows the empty state when there are no weekly scores", async () => {
    mockApi.get.mockResolvedValueOnce({ data: [] });
    render(<PerformancePage />);

    await waitFor(() =>
      expect(screen.getByText(/No workouts yet/i)).toBeInTheDocument(),
    );
  });

  it("shows an error state when the request fails", async () => {
    mockApi.get.mockRejectedValueOnce(new Error("network"));
    render(<PerformancePage />);

    await waitFor(() =>
      expect(
        screen.getByText(/Could not load your performance data/i),
      ).toBeInTheDocument(),
    );
  });
});
