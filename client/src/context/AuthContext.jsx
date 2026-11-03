
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { getToken, request } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (getToken()) {
      request("/auth/me")
        .then((d) => setUser(d.user))
        .catch(() => localStorage.removeItem("sthala_token"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    const d = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    localStorage.setItem("sthala_token", d.token);
    setUser(d.user);
  };

  const register = async (payload) => {
    const d = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    localStorage.setItem("sthala_token", d.token);
    setUser(d.user);
  };

  const logout = () => {
    localStorage.removeItem("sthala_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
