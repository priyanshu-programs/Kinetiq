import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "./authStore";
import { api, clearToken, getToken, setToken } from "../lib/api";

vi.mock("../lib/api", () => {
  let token: string | null = null;
  return {
    api: { get: vi.fn(), post: vi.fn() },
    getToken: vi.fn(() => token),
    setToken: vi.fn((t: string) => {
      token = t;
    }),
    clearToken: vi.fn(() => {
      token = null;
    }),
  };
});

const mockApi = vi.mocked(api);

beforeEach(() => {
  vi.clearAllMocks();
  clearToken();
  useAuthStore.setState({ user: null, loading: false, initialized: false });
});

describe("authStore", () => {
  it("login stores the token and fetched user", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { access_token: "tok123" } });
    mockApi.get.mockResolvedValueOnce({
      data: { id: 1, email: "a@b.com", role: "user", profile: null },
    });

    await useAuthStore.getState().login("a@b.com", "password123");

    expect(setToken).toHaveBeenCalledWith("tok123");
    expect(useAuthStore.getState().user?.email).toBe("a@b.com");
  });

  it("logout clears the token and user", () => {
    useAuthStore.setState({ user: { id: 1, email: "a@b.com", role: "user", profile: null } });
    useAuthStore.getState().logout();

    expect(clearToken).toHaveBeenCalled();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("hydrate with no token just marks initialized (no /me call)", async () => {
    await useAuthStore.getState().hydrate();

    expect(getToken).toHaveBeenCalled();
    expect(mockApi.get).not.toHaveBeenCalled();
    expect(useAuthStore.getState().initialized).toBe(true);
  });

  it("hydrate with a token restores the user", async () => {
    setToken("tok123");
    mockApi.get.mockResolvedValueOnce({
      data: { id: 7, email: "c@d.com", role: "user", profile: null },
    });

    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().user?.id).toBe(7);
    expect(useAuthStore.getState().initialized).toBe(true);
  });
});
