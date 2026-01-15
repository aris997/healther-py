import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("healther.token") || "");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");

  const refresh = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const u = await api.me(token);
      setUser(u);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    refresh();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.login({ username: email, password });
    localStorage.setItem("healther.token", res.access_token);
    setToken(res.access_token);
  };

  const register = async (email, password) => {
    await api.register({ email, password });
    await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem("healther.token");
    setUser(null);
    setToken("");
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, error, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
