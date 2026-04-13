import axios from "axios";
import { QueryClient } from "@tanstack/react-query";
import { AxiosHeaders } from "axios";
import type { InternalAxiosRequestConfig } from "axios";

import type { AuthUser } from "@/stores/auth.store";
import { useAuthStore } from "@/stores/auth.store";

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

type RefreshResponse = {
  accessToken: string;
  user?: AuthUser | null;
};

export const refreshAccessToken = async (): Promise<string | null> => {
  if (!refreshRequest) {
    refreshRequest = refreshApi
      .post<RefreshResponse>("/auth/refresh")
      .then((response) => {
        const currentUser = useAuthStore.getState().user;
        useAuthStore.getState().setSession(response.data.accessToken, response.data.user ?? currentUser);
        return response.data.accessToken;
      })
      .catch(() => {
        useAuthStore.getState().clearSession();
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
