import { create } from "zustand";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: "ADMIN" | "STUDENT";
  locale?: "en" | "ar";
  theme?: "light" | "dark";
  avatarUrl?: string | null;
};

type AuthState = {
  accessToken: string | null;
  user: AuthUser | null;
  isAuthReady: boolean;
  hasRefreshToken: boolean;
  setSession: (accessToken: string | null, user: AuthUser | null) => void;
  clearSession: () => void;
  markAuthReady: () => void;
};

const getStoredRefreshFlag = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem("eduflow-has-refresh") === "1";
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isAuthReady: false,
  hasRefreshToken: getStoredRefreshFlag(),
  setSession: (accessToken, user) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("eduflow-has-refresh", "1");
    }
    set({ accessToken, user, hasRefreshToken: true });
  },
  clearSession: () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("eduflow-has-refresh");
    }
    set({ accessToken: null, user: null, hasRefreshToken: false });
  },
  markAuthReady: () => set({ isAuthReady: true })
}));
