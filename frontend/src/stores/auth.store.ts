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
  updateUser: (updates: Partial<AuthUser>) => void;
  clearSession: () => void;
  markAuthReady: () => void;
};

const USER_SNAPSHOT_KEY = "eduflow-user";
const REFRESH_FLAG_KEY = "eduflow-has-refresh";
const REFRESH_MARKER_COOKIE = "eduflow_refresh_present";

const hasRefreshMarkerCookie = () => {
  if (typeof document === "undefined") {
    return false;
  }

  return document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .some((entry) => entry === `${REFRESH_MARKER_COOKIE}=1`);
};

const getStoredRefreshFlag = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(REFRESH_FLAG_KEY) === "1" || hasRefreshMarkerCookie();
};

export const hasStoredRefreshFlag = () => getStoredRefreshFlag();

const getStoredUser = (): AuthUser | null => {
  if (typeof window === "undefined") {
    return null;
  }

  if (!getStoredRefreshFlag()) {
    window.localStorage.removeItem(USER_SNAPSHOT_KEY);
    window.localStorage.removeItem(REFRESH_FLAG_KEY);
    return null;
  }

  const raw = window.localStorage.getItem(USER_SNAPSHOT_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    window.localStorage.removeItem(USER_SNAPSHOT_KEY);
    return null;
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: getStoredUser(),
  isAuthReady: false,
  hasRefreshToken: getStoredRefreshFlag(),
  setSession: (accessToken, user) => {
    if (typeof window !== "undefined") {
      if (user) {
        window.localStorage.setItem(USER_SNAPSHOT_KEY, JSON.stringify(user));
      } else {
        window.localStorage.removeItem(USER_SNAPSHOT_KEY);
      }

      window.localStorage.setItem(REFRESH_FLAG_KEY, "1");
    }
    set({ accessToken, user, hasRefreshToken: true });
  },
  updateUser: (updates) =>
    set((state) => {
      if (!state.user) {
        return state;
      }

      const nextUser = { ...state.user, ...updates };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(USER_SNAPSHOT_KEY, JSON.stringify(nextUser));
      }

      return { ...state, user: nextUser };
    }),
  clearSession: () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(USER_SNAPSHOT_KEY);
      window.localStorage.removeItem(REFRESH_FLAG_KEY);
      document.cookie = `${REFRESH_MARKER_COOKIE}=; Max-Age=0; path=/; SameSite=Strict`;
    }
    set({ accessToken: null, user: null, hasRefreshToken: false });
  },
  markAuthReady: () => set({ isAuthReady: true })
}));
