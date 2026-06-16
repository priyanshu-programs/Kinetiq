import { create } from "zustand";

import { api, clearToken, getToken, setToken } from "../lib/api";
import type { User } from "../lib/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hydrate: () => Promise<void>;
}

async function fetchMe(): Promise<User> {
  const { data } = await api.get<User>("/auth/me");
  return data;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  login: async (email, password) => {
    // OAuth2 password flow expects form-encoded username/password.
    const form = new URLSearchParams({ username: email, password });
    const { data } = await api.post<{ access_token: string }>(
      "/auth/login",
      form,
    );
    setToken(data.access_token);
    const user = await fetchMe();
    set({ user });
  },

  register: async (email, password) => {
    await api.post("/auth/register", { email, password });
  },

  logout: () => {
    clearToken();
    set({ user: null });
  },

  // Restore session on app load if a token is present.
  hydrate: async () => {
    if (!getToken()) {
      set({ initialized: true });
      return;
    }
    set({ loading: true });
    try {
      const user = await fetchMe();
      set({ user });
    } catch {
      clearToken();
    } finally {
      set({ loading: false, initialized: true });
    }
  },
}));
