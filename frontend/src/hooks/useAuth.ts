import { useCallback } from "react";

import { api, clearAuthenticatedSession, setAuthenticatedSession } from "@/lib/api";
import type { AuthUser } from "@/stores/auth.store";
import { useAuthStore } from "@/stores/auth.store";

type SessionResponse = {
  accessToken: string;
  user: AuthUser;
};

export const useAuth = () => {
  const { accessToken, user, isAuthReady } = useAuthStore();

  const login = useCallback(
    async (
      email: string,
      password: string,
      options?: { captchaToken?: string; headers?: Record<string, string> }
    ) => {
      const response = await api.post<SessionResponse>(
        "/auth/login",
        { email, password, captchaToken: options?.captchaToken },
        { headers: options?.headers }
      );
      setAuthenticatedSession(response.data.accessToken, response.data.user);
      return response.data.user;
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      clearAuthenticatedSession();
    }
  }, []);

  const refresh = useCallback(async () => {
    const response = await api.post<SessionResponse>("/auth/refresh");
    setAuthenticatedSession(response.data.accessToken, response.data.user);
    return response.data.user;
  }, []);

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
