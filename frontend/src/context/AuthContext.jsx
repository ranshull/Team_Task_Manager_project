import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { api, setAuthAccessToken, setAuthLogoutHandler, setAuthTokenUpdater } from "../api/axios.js";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null);
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [ready, setReady] = useState(false);

  const logout = useCallback(() => {
    setAccessToken(null);
    setAuthAccessToken(null);
    setUser(null);
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    window.location.assign("/login");
  }, []);

  const applySession = useCallback((tokens, nextUser = user) => {
    if (tokens?.access_token) {
      setAccessToken(tokens.access_token);
      setAuthAccessToken(tokens.access_token);
    }
    if (tokens?.refresh_token) {
      localStorage.setItem("refresh_token", tokens.refresh_token);
    }
    if (nextUser) {
      setUser(nextUser);
      localStorage.setItem("user", JSON.stringify(nextUser));
    }
  }, [user]);

  useEffect(() => {
    setAuthTokenUpdater((token) => {
      setAccessToken(token);
      setAuthAccessToken(token);
    });
    setAuthLogoutHandler(logout);
  }, [logout]);

  useEffect(() => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!accessToken && refreshToken) {
      api.post("/api/auth/refresh", { refresh_token: refreshToken })
        .then(async (res) => {
          applySession(res.data);
          const me = await api.get("/api/auth/me");
          setUser(me.data);
          localStorage.setItem("user", JSON.stringify(me.data));
        })
        .catch(() => logout())
        .finally(() => setReady(true));
    } else {
      setReady(true);
    }
  }, []);

  const login = async (identifier, password) => {
    const form = new URLSearchParams();
    form.set("username", identifier);
    form.set("password", password);
    const { data } = await axios.post(`${api.defaults.baseURL}/api/auth/login`, form);
    applySession(data);
    const me = await api.get("/api/auth/me", {
      headers: { Authorization: `Bearer ${data.access_token}` }
    });
    setUser(me.data);
    localStorage.setItem("user", JSON.stringify(me.data));
  };

  const signup = async (payload) => {
    const { data: createdUser } = await api.post("/api/auth/signup", payload);
    await login(payload.email, payload.password);
    return createdUser;
  };

  const updateProfile = useCallback(async (payload) => {
    const { data } = await api.put("/api/auth/me", payload);
    setUser(data);
    localStorage.setItem("user", JSON.stringify(data));
    return data;
  }, []);

  const value = useMemo(() => ({
    accessToken,
    user,
    isAuthenticated: Boolean(user && localStorage.getItem("refresh_token")),
    isAdmin: user?.role === "admin",
    ready,
    login,
    signup,
    updateProfile,
    logout
  }), [accessToken, user, ready, logout, updateProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
