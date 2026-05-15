import axios from "axios";

let accessToken = null;
let tokenUpdater = null;
let logoutHandler = null;
let refreshing = null;

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000"
});

export function setAuthAccessToken(token) {
  accessToken = token;
}

export function setAuthTokenUpdater(handler) {
  tokenUpdater = handler;
}

export function setAuthLogoutHandler(handler) {
  logoutHandler = handler;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original?._retry) {
      if (error.response?.status === 401) logoutHandler?.();
      return Promise.reject(error);
    }
    original._retry = true;
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
      logoutHandler?.();
      return Promise.reject(error);
    }
    refreshing ||= api.post("/api/auth/refresh", { refresh_token: refreshToken })
      .then((res) => {
        accessToken = res.data.access_token;
        tokenUpdater?.(accessToken);
        return accessToken;
      })
      .finally(() => {
        refreshing = null;
      });
    const newToken = await refreshing;
    original.headers.Authorization = `Bearer ${newToken}`;
    return api(original);
  }
);
