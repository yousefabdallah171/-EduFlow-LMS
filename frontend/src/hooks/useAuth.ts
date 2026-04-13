import { useCallback } from "react";

import { api } from "@/lib/api";
import type { AuthUser } from "@/stores/auth.store";
import { useAuthStore } from "@/stores/auth.store";

type SessionResponse = {
  accessToken: string;
  user: AuthUser;
};

export const useAuth = () => {
  const { accessToken, user, setSession, clearSession, isAuthReady } = useAuthStore();

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await api.post<SessionResponse>("/auth/login", { email, password });
      setSession(response.data.accessToken, response.data.user);
      return response.data.user;
    },
    [setSession]
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const refresh = useCallback(async () => {
    const response = await api.post<SessionResponse>("/auth/refresh");
    setSession(response.data.accessToken, response.data.user);
    return response.data.user;
  }, [setSession]);

  const redirectToGoogle = useCallback(() => {
    window.location.assign("/api/v1/auth/oauth/google");
  }, []);

  return {
    accessToken,
    isAuthReady,
    user,
    login,
    logout,
    refresh,
    redirectToGoogle
  };
};
