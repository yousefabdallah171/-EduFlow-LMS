import axios from "axios";
import { QueryClient } from "@tanstack/react-query";
import { AxiosHeaders } from "axios";
import type { InternalAxiosRequestConfig } from "axios";

import type { AuthUser } from "@/stores/auth.store";
import { hasStoredRefreshFlag, useAuthStore } from "@/stores/auth.store";

export const queryClient = new QueryClient();

export const api = axios.create({
  baseURL: "/api/v1",
  withCredentials: true
});

const refreshApi = axios.create({
  baseURL: "/api/v1",
  withCredentials: true
});

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

let refreshRequest: Promise<string | null> | null = null;
let refreshTimer: number | null = null;

type RefreshResponse = {
  accessToken: string;
  user?: AuthUser | null;
};

const ACCESS_TOKEN_REFRESH_BUFFER_MS = 60 * 1000;
const MIN_REFRESH_DELAY_MS = 15 * 1000;

const clearRefreshTimer = () => {
  if (typeof window === "undefined" || refreshTimer === null) {
    return;
  }

  window.clearTimeout(refreshTimer);
  refreshTimer = null;
};

const getTokenExpiryMs = (token: string | null | undefined): number | null => {
  if (!token) {
    return null;
  }

  try {
    const encodedPayload = (token.split(".")[1] ?? "").replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = encodedPayload.padEnd(Math.ceil(encodedPayload.length / 4) * 4, "=");
    const payload = JSON.parse(window.atob(paddedPayload));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

export const isAccessTokenExpiringSoon = (
  token: string | null | undefined,
  bufferMs = ACCESS_TOKEN_REFRESH_BUFFER_MS
) => {
  const expiryMs = getTokenExpiryMs(token);
  if (!expiryMs) {
    return false;
  }

  return expiryMs - Date.now() <= bufferMs;
};

const scheduleRefresh = (token: string | null) => {
  clearRefreshTimer();

  if (typeof window === "undefined" || !token) {
    return;
  }

  const expiryMs = getTokenExpiryMs(token);
  if (!expiryMs) {
    return;
  }

  const delayMs = Math.max(expiryMs - Date.now() - ACCESS_TOKEN_REFRESH_BUFFER_MS, MIN_REFRESH_DELAY_MS);
  refreshTimer = window.setTimeout(() => {
    void refreshAccessToken();
  }, delayMs);
};

export const setAuthenticatedSession = (accessToken: string, user: AuthUser | null) => {
  useAuthStore.getState().setSession(accessToken, user);
  scheduleRefresh(accessToken);
};

export const clearAuthenticatedSession = () => {
  clearRefreshTimer();
  useAuthStore.getState().clearSession();
};

export const refreshAccessToken = async (): Promise<string | null> => {
  if (!hasStoredRefreshFlag()) {
    clearAuthenticatedSession();
    return null;
  }

  if (!refreshRequest) {
    refreshRequest = refreshApi
      .post<RefreshResponse>("/auth/refresh")
      .then((response) => {
        const currentUser = useAuthStore.getState().user;
        setAuthenticatedSession(response.data.accessToken, response.data.user ?? currentUser);
        return response.data.accessToken;
      })
      .catch((error) => {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        const refreshSessionWasRejected = status === 401 || status === 403;

        if (refreshSessionWasRejected) {
          clearAuthenticatedSession();
        }
        return null;
      })
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
};

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const requestUrl = originalRequest?.url ?? "";
    const isAuthEndpoint = requestUrl.startsWith("/auth/");

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      originalRequest._retry = true;

      const refreshedToken = await refreshAccessToken();
      if (refreshedToken) {
        const headers = AxiosHeaders.from(originalRequest.headers);
        headers.set("Authorization", `Bearer ${refreshedToken}`);
        originalRequest.headers = headers;
        return api(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);
